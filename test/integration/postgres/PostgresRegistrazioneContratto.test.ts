import Indirizzo from "../../../src/domain/Indirizzo";
import PostgresContrattoRepository from "../../../src/infrastructure/persistence/postgres/PostgresContrattoRepository";
import PostgresImmobileRepository from "../../../src/infrastructure/persistence/postgres/PostgresImmobileRepository";
import PostgresPersonaRepository from "../../../src/infrastructure/persistence/postgres/PostgresPersonaRepository";
import PostgresRegistrazioneContratto from "../../../src/infrastructure/persistence/postgres/PostgresRegistrazioneContratto";
import PostgresTipologiaContrattualeRepository from "../../../src/infrastructure/persistence/postgres/PostgresTipologiaContrattualeRepository";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";
import {
  creaContrattoNuovo,
  creaTipologiaPersistita,
} from "../../support/PostgresRegistrazioneContrattoFixture";
import { creaScenarioRepository } from "../../support/PostgresRepositoryFixture";

jest.setTimeout(15_000);

describe("PostgresRegistrazioneContratto", () => {
  let database: PostgresTestDatabase;

  beforeAll(async () => {
    database = await PostgresTestDatabase.crea();
  });

  beforeEach(async () => {
    await database.reset();
  });

  afterAll(async () => {
    await database.chiudi();
  });

  test("registra atomicamente un contratto con immobile e persone nuovi", async () => {
    const tipologia = await creaTipologiaPersistita(database.client);
    const contratto = creaContrattoNuovo(tipologia);
    const registrazione = new PostgresRegistrazioneContratto(database.client);

    await registrazione.registraDefinitivamente(contratto);

    const conteggi = await database.client.query<{
      immobili: number;
      persone: number;
      documenti: number;
      contratti: number;
      pagamenti: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM immobile) AS immobili,
        (SELECT COUNT(*)::int FROM persona) AS persone,
        (SELECT COUNT(*)::int FROM documento_riconoscimento) AS documenti,
        (SELECT COUNT(*)::int FROM contratto) AS contratti,
        (SELECT COUNT(*)::int FROM pagamento) AS pagamenti
    `);

    expect(conteggi.rows[0]).toEqual({
      immobili: 1,
      persone: 2,
      documenti: 1,
      contratti: 1,
      pagamenti: 1,
    });

    const contrattoIdResult = await database.client.query<{ id: number }>(
      "SELECT id FROM contratto",
    );
    const contrattoId = contrattoIdResult.rows[0]?.id;

    if (contrattoId === undefined) {
      throw new Error("Contratto persistito non trovato");
    }

    const repository = new PostgresContrattoRepository(database.client);
    const persistito = await repository.trovaPerId(contrattoId);

    expect(persistito?.nomeDescrizione).toBe(
      "Contratto nuova registrazione",
    );
    expect(persistito?.al.toISOString()).toBe(
      "2029-09-14T00:00:00.000Z",
    );
    expect(persistito?.contenuto).toBe(
      "<article>Contratto definitivo</article>",
    );
    expect(persistito?.pagamenti).toHaveLength(1);
    expect(persistito?.pagamenti[0]?.importo).toBe(480);
    expect(persistito?.inquilino.documento?.numero).toBe("CA1234567");
  });

  test("riusa immobile e persone persistiti salvando le modifiche validate alle persone", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const immobileRepository = new PostgresImmobileRepository(database.client);
    const personaRepository = new PostgresPersonaRepository(database.client);
    const tipologiaRepository =
      new PostgresTipologiaContrattualeRepository(database.client);

    const immobile = await immobileRepository.trovaPerId(scenario.immobileId);
    const proprietario = await personaRepository.trovaPerId(
      scenario.proprietarioId,
    );
    const inquilino = await personaRepository.trovaPerId(
      scenario.inquilinoId,
    );
    const tipologia = await tipologiaRepository.trovaPerIdConArticoli(
      scenario.tipologiaId,
    );

    if (
      immobile === null ||
      proprietario === null ||
      inquilino === null ||
      tipologia === null ||
      inquilino.documento === undefined
    ) {
      throw new Error("Fixture PostgreSQL incompleta");
    }

    proprietario.aggiornaDatiAnagrafici(
      "Paolo aggiornato",
      proprietario.cognome,
      proprietario.luogoNascita,
      proprietario.dataNascita,
    );
    proprietario.cambiaResidenza(
      new Indirizzo({
        provincia: "RM",
        comune: "Roma",
        indirizzo: "Via Residenza Nuova",
        civico: "99",
      }),
    );
    inquilino.documento.numero = "CA9999999";

    const contratto = creaContrattoNuovo(tipologia);
    contratto.immobile = immobile;
    contratto.proprietario = proprietario;
    contratto.inquilino = inquilino;

    const registrazione = new PostgresRegistrazioneContratto(database.client);
    await registrazione.registraDefinitivamente(contratto);

    const conteggi = await database.client.query<{
      immobili: number;
      persone: number;
      indirizzi: number;
      contratti: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM immobile) AS immobili,
        (SELECT COUNT(*)::int FROM persona) AS persone,
        (SELECT COUNT(*)::int FROM indirizzo) AS indirizzi,
        (SELECT COUNT(*)::int FROM contratto) AS contratti
    `);

    expect(conteggi.rows[0]).toEqual({
      immobili: 1,
      persone: 2,
      indirizzi: 4,
      contratti: 1,
    });

    const proprietarioPersistito =
      await personaRepository.trovaPerCodiceFiscale(
        proprietario.codiceFiscale,
      );
    const inquilinoPersistito = await personaRepository.trovaPerCodiceFiscale(
      inquilino.codiceFiscale,
    );

    expect(proprietarioPersistito?.id).toBe(scenario.proprietarioId);
    expect(proprietarioPersistito?.nome).toBe("Paolo aggiornato");
    expect(proprietarioPersistito?.residenza.indirizzo).toBe(
      "Via Residenza Nuova",
    );
    expect(inquilinoPersistito?.id).toBe(scenario.inquilinoId);
    expect(inquilinoPersistito?.documento?.numero).toBe("CA9999999");
  });

  test("esegue rollback se un errore avviene dopo la creazione dei dati definitivi collegati", async () => {
    const tipologia = await creaTipologiaPersistita(database.client);
    const contratto = creaContrattoNuovo(tipologia, {
      importoPagamento: 999_999_999_999,
    });
    const registrazione = new PostgresRegistrazioneContratto(database.client);

    await expect(
      registrazione.registraDefinitivamente(contratto),
    ).rejects.toBeDefined();

    const conteggi = await database.client.query<{
      indirizzi: number;
      datiCatastali: number;
      immobili: number;
      persone: number;
      documenti: number;
      contratti: number;
      pagamenti: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM indirizzo) AS indirizzi,
        (SELECT COUNT(*)::int FROM dati_catastali) AS "datiCatastali",
        (SELECT COUNT(*)::int FROM immobile) AS immobili,
        (SELECT COUNT(*)::int FROM persona) AS persone,
        (SELECT COUNT(*)::int FROM documento_riconoscimento) AS documenti,
        (SELECT COUNT(*)::int FROM contratto) AS contratti,
        (SELECT COUNT(*)::int FROM pagamento) AS pagamenti
    `);

    expect(conteggi.rows[0]).toEqual({
      indirizzi: 0,
      datiCatastali: 0,
      immobili: 0,
      persone: 0,
      documenti: 0,
      contratti: 0,
      pagamenti: 0,
    });

    const tipologie = await database.client.query<{ totale: number }>(
      "SELECT COUNT(*)::int AS totale FROM tipologia_contrattuale",
    );
    expect(tipologie.rows[0]?.totale).toBe(1);
  });

  test("rifiuta un contratto privo delle precondizioni definitive", async () => {
    const tipologia = await creaTipologiaPersistita(database.client);
    const registrazione = new PostgresRegistrazioneContratto(database.client);

    const senzaContenuto = creaContrattoNuovo(tipologia, {
      contenuto: "   ",
    });

    await expect(
      registrazione.registraDefinitivamente(senzaContenuto),
    ).rejects.toThrow("documento storico");

    const senzaPagamenti = creaContrattoNuovo(tipologia, {
      aggiungiPagamento: false,
    });

    await expect(
      registrazione.registraDefinitivamente(senzaPagamenti),
    ).rejects.toThrow("almeno un pagamento");

    const definitivi = await database.client.query<{
      contratti: number;
      immobili: number;
      persone: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM contratto) AS contratti,
        (SELECT COUNT(*)::int FROM immobile) AS immobili,
        (SELECT COUNT(*)::int FROM persona) AS persone
    `);

    expect(definitivi.rows[0]).toEqual({
      contratti: 0,
      immobili: 0,
      persone: 0,
    });
  });
});
