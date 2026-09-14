import PostgresTipologiaContrattualeRepository from "../../../src/infrastructure/persistence/postgres/PostgresTipologiaContrattualeRepository";
import { caricaTemplateContrattuali } from "../../../src/infrastructure/persistence/postgres/SeedTemplateContrattuali";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";

describe("seed PostgreSQL dei template contrattuali", () => {
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

  test("carica le due tipologie versionate con i relativi articoli", async () => {
    const esito = await caricaTemplateContrattuali(database.client);
    const repository = new PostgresTipologiaContrattualeRepository(
      database.client,
    );

    const tipologie = await repository.trovaTutte();

    expect(esito.tipologie).toBe(2);
    expect(tipologie.map((tipologia) => tipologia.denominazione)).toEqual([
      "Canone concordato",
      "Canone libero",
    ]);

    const numeroArticoli = tipologie.reduce(
      (totale, tipologia) => totale + tipologia.articoli.length,
      0,
    );

    expect(esito.articoli).toBe(numeroArticoli);
    expect(numeroArticoli).toBeGreaterThan(0);
    expect(
      tipologie.every((tipologia) => tipologia.articoli.length > 0),
    ).toBe(true);
  });

  test("può essere rilanciato senza duplicare dati e riallinea gli articoli ai JSON", async () => {
    const primoEsito = await caricaTemplateContrattuali(database.client);

    await database.client.query(`
      UPDATE articolo
      SET descrizione = 'TESTO ALTERATO'
      WHERE id = (
        SELECT MIN(id)
        FROM articolo
      )
    `);

    const secondoEsito = await caricaTemplateContrattuali(database.client);

    const conteggi = await database.client.query<{
      tipologie: string;
      articoli: string;
      alterati: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM tipologia_contrattuale)::text AS tipologie,
        (SELECT COUNT(*) FROM articolo)::text AS articoli,
        (
          SELECT COUNT(*)
          FROM articolo
          WHERE descrizione = 'TESTO ALTERATO'
        )::text AS alterati
    `);

    expect(secondoEsito).toEqual(primoEsito);
    expect(Number(conteggi.rows[0]?.tipologie)).toBe(2);
    expect(Number(conteggi.rows[0]?.articoli)).toBe(primoEsito.articoli);
    expect(Number(conteggi.rows[0]?.alterati)).toBe(0);
  });
});
