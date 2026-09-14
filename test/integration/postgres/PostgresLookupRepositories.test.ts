import DatiCatastali from "../../../src/domain/DatiCatastali";
import Indirizzo from "../../../src/domain/Indirizzo";
import PostgresImmobileRepository from "../../../src/infrastructure/persistence/postgres/PostgresImmobileRepository";
import PostgresPersonaRepository from "../../../src/infrastructure/persistence/postgres/PostgresPersonaRepository";
import PostgresTipologiaContrattualeRepository from "../../../src/infrastructure/persistence/postgres/PostgresTipologiaContrattualeRepository";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";
import { creaScenarioRepository } from "../../support/PostgresRepositoryFixture";

jest.setTimeout(15_000);

describe("repository PostgreSQL di consultazione UC-01", () => {
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

  test("ImmobileRepository ricostruisce indirizzo e dati catastali e cerca per chiave catastale", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const repository = new PostgresImmobileRepository(database.client);

    const immobile = await repository.trovaPerId(scenario.immobileId);
    const trovatoPerCatasto = await repository.trovaPerDatiCatastali(
      new DatiCatastali({
        codiceComunale: "H501",
        foglio: 12,
        particella: 345,
        subalterno: 7,
        categoria: "categoria irrilevante per la ricerca",
        consistenza: 0,
        rendita: 0,
      }),
    );

    expect(immobile?.nome).toBe("Casa Roma");
    expect(immobile?.indirizzo.interno).toBe("3");
    expect(immobile?.datiCatastali.consistenza).toBe(5.5);
    expect(immobile?.datiCatastali.rendita).toBe(987.65);
    expect(trovatoPerCatasto?.id).toBe(scenario.immobileId);
  });

  test("ImmobileRepository confronta l'indirizzo completo usando anche i campi opzionali", async () => {
    await creaScenarioRepository(database.client);
    const repository = new PostgresImmobileRepository(database.client);

    const duplicato = new Indirizzo({
      nazione: "Italia",
      provincia: "RM",
      comune: "Roma",
      cap: "00100",
      indirizzo: "Via delle Rose",
      civico: "10",
      scala: "A",
      interno: "3",
    });
    const diverso = new Indirizzo({
      nazione: "Italia",
      provincia: "RM",
      comune: "Roma",
      cap: "00100",
      indirizzo: "Via delle Rose",
      civico: "10",
      scala: "A",
      interno: "4",
    });

    expect(await repository.esisteConIndirizzo(duplicato)).toBe(true);
    expect(await repository.esisteConIndirizzo(diverso)).toBe(false);
  });

  test("PersonaRepository ricostruisce residenza, date civili e documento dell'inquilino", async () => {
    await creaScenarioRepository(database.client);
    const repository = new PostgresPersonaRepository(database.client);

    const persona = await repository.trovaPerCodiceFiscale(
      "NQLLRI90S60F205Z",
    );

    expect(persona?.nome).toBe("Ilaria");
    expect(persona?.dataNascita.toISOString()).toBe(
      "1990-11-20T00:00:00.000Z",
    );
    expect(persona?.residenza.civico).toBeUndefined();
    expect(persona?.documento?.tipo).toBe("carta d'identità");
    expect(persona?.documento?.dataScadenza.toISOString()).toBe(
      "2035-01-10T00:00:00.000Z",
    );
  });

  test("TipologiaContrattualeRepository restituisce gli articoli ordinati per numero e parte", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const repository = new PostgresTipologiaContrattualeRepository(
      database.client,
    );

    const tipologia = await repository.trovaPerIdConArticoli(
      scenario.tipologiaId,
    );

    expect(tipologia?.durata).toBe(3);
    expect(
      tipologia?.articoli.map((articolo) => [
        articolo.numArticolo,
        articolo.numParte,
      ]),
    ).toEqual([
      [1, 0],
      [1, 1],
      [2, 0],
    ]);
  });
});
