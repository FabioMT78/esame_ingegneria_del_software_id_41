import Articolo from "../../../src/domain/Articolo";
import DatiCatastali from "../../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../../src/domain/Immobile";
import Indirizzo from "../../../src/domain/Indirizzo";
import Persona from "../../../src/domain/Persona";
import TipologiaContrattuale from "../../../src/domain/TipologiaContrattuale";
import BozzaContratto from "../../../src/application/model/BozzaContratto";
import PostgresBozzaContrattoRepository from "../../../src/infrastructure/persistence/postgres/PostgresBozzaContrattoRepository";
import PostgresImmobileRepository from "../../../src/infrastructure/persistence/postgres/PostgresImmobileRepository";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";
import { creaScenarioRepository } from "../../support/PostgresRepositoryFixture";

jest.setTimeout(15_000);

function creaBozzaCompleta(immobile: Immobile): BozzaContratto {
  const residenzaProprietario = new Indirizzo({
    provincia: "RM",
    comune: "Roma",
    indirizzo: "Via Nuovo Proprietario",
  });
  const residenzaInquilino = new Indirizzo({
    nazione: "Italia",
    provincia: "RM",
    comune: "Roma",
    cap: "00100",
    indirizzo: "Via Nuovo Inquilino",
    civico: "5",
    interno: "2",
  });

  const proprietario = new Persona({
    nome: "Nuovo",
    cognome: "Proprietario",
    luogoNascita: "Roma",
    dataNascita: new Date(Date.UTC(1975, 4, 6)),
    codiceFiscale: "PRPNVO75E06H501Q",
    residenza: residenzaProprietario,
  });
  const inquilino = new Persona({
    nome: "Nuova",
    cognome: "Inquilina",
    luogoNascita: "Roma",
    dataNascita: new Date(Date.UTC(1992, 7, 12)),
    codiceFiscale: "NQLNVA92M52H501R",
    residenza: residenzaInquilino,
    documento: new DocumentoRiconoscimento({
      tipo: "passaporto",
      organoEmittente: "Questura di Roma",
      dataRilascio: new Date(Date.UTC(2024, 0, 10)),
      dataScadenza: new Date(Date.UTC(2034, 0, 10)),
      numero: "YA1234567",
    }),
  });
  const tipologia = new TipologiaContrattuale({
    id: 42,
    denominazione: "Tipologia bozza",
    durata: 3,
    rinnovo: 2,
    articoli: [
      new Articolo({
        id: 101,
        numArticolo: 1,
        numParte: 0,
        titolo: "Articolo bozza",
        descrizione: "Testo bozza",
      }),
    ],
  });

  return new BozzaContratto({
    stepCompletato: 4,
    immobile,
    proprietario,
    inquilino,
    tipologia,
    nomeDescrizione: "Contratto in preparazione",
    dal: new Date(Date.UTC(2027, 2, 15)),
    al: new Date(Date.UTC(2030, 2, 14)),
    canoneMensile: 875.5,
    giornoPagamento: 12,
  });
}


function richiediIdBozza(bozza: BozzaContratto): number {
  if (bozza.idBozza === undefined) {
    throw new Error("Bozza persistita senza identificatore");
  }

  return bozza.idBozza;
}

function creaImmobileNuovo(): Immobile {
  return new Immobile({
    nome: "Immobile nuovo",
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Nuova",
      civico: "8",
      interno: "4",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 99,
      particella: 88,
      subalterno: 7,
      categoria: "A/3",
      consistenza: 4.5,
      rendita: 750.25,
    }),
  });
}

describe("PostgresBozzaContrattoRepository", () => {
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

  test("salva e ricostruisce una bozza completa assegnando idBozza", async () => {
    const repository = new PostgresBozzaContrattoRepository(database.client);
    const salvata = await repository.salva(
      creaBozzaCompleta(creaImmobileNuovo()),
    );

    expect(salvata.idBozza).toBeDefined();

    const riletta = await repository.trovaPerId(richiediIdBozza(salvata));

    expect(riletta).not.toBeNull();
    expect(riletta?.nomeDescrizione).toBe("Contratto in preparazione");
    expect(riletta?.immobile?.datiCatastali.rendita).toBe(750.25);
    expect(riletta?.inquilino?.documento?.tipo).toBe("passaporto");
    expect(riletta?.tipologia?.articoli[0]?.descrizione).toBe("Testo bozza");
    expect(riletta?.dal?.toISOString()).toBe("2027-03-15T00:00:00.000Z");
    expect(riletta?.al?.toISOString()).toBe("2030-03-14T00:00:00.000Z");
  });

  test("aggiorna immobile_id quando la bozza seleziona un immobile persistito e lo azzera tornando a uno nuovo", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const immobileRepository = new PostgresImmobileRepository(database.client);
    const bozzaRepository = new PostgresBozzaContrattoRepository(database.client);
    const immobilePersistito = await immobileRepository.trovaPerId(
      scenario.immobileId,
    );

    if (immobilePersistito === null) {
      throw new Error("Fixture immobile non disponibile");
    }

    let bozza = await bozzaRepository.salva(
      creaBozzaCompleta(immobilePersistito),
    );

    expect(
      await bozzaRepository.trovaPerImmobileId(scenario.immobileId),
    ).not.toBeNull();

    bozza.immobile = creaImmobileNuovo();
    bozza = await bozzaRepository.salva(bozza);

    expect(
      await bozzaRepository.trovaPerImmobileId(scenario.immobileId),
    ).toBeNull();
    expect((await bozzaRepository.elenca()).map((item) => item.idBozza)).toEqual([
      bozza.idBozza,
    ]);
  });

  test("elimina esclusivamente la bozza indicata", async () => {
    const repository = new PostgresBozzaContrattoRepository(database.client);
    const prima = await repository.salva(
      creaBozzaCompleta(creaImmobileNuovo()),
    );
    const seconda = await repository.salva(
      creaBozzaCompleta(creaImmobileNuovo()),
    );

    await repository.elimina(richiediIdBozza(prima));

    expect(await repository.trovaPerId(richiediIdBozza(prima))).toBeNull();
    expect(await repository.trovaPerId(richiediIdBozza(seconda))).not.toBeNull();
  });
});
