import PostgresTestDatabase from "../../support/PostgresTestDatabase";

describe("vincoli PostgreSQL sui dati catastali", () => {
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

  test("accetta valori numerici uguali a zero", async () => {
    await expect(
      database.client.query(`
        INSERT INTO dati_catastali (
          codice_comunale,
          foglio,
          particella,
          subalterno,
          categoria,
          consistenza,
          rendita
        )
        VALUES ('H501', 0, 0, 0, 'A/2', 0, 0)
      `),
    ).resolves.toBeDefined();
  });

  test.each([
    ["foglio", -1, 1, 1, 1, 1],
    ["particella", 1, -1, 1, 1, 1],
    ["subalterno", 1, 1, -1, 1, 1],
    ["consistenza", 1, 1, 1, -1, 1],
    ["rendita", 1, 1, 1, 1, -1],
  ] as const)(
    "rifiuta %s negativo",
    async (_campo, foglio, particella, subalterno, consistenza, rendita) => {
      await expect(
        database.client.query(
          `
            INSERT INTO dati_catastali (
              codice_comunale,
              foglio,
              particella,
              subalterno,
              categoria,
              consistenza,
              rendita
            )
            VALUES ('H501', $1, $2, $3, 'A/2', $4, $5)
          `,
          [foglio, particella, subalterno, consistenza, rendita],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    },
  );
});
