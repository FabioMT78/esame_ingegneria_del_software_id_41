import PostgresTipologiaContrattualeRepository from "../../../src/infrastructure/persistence/postgres/PostgresTipologiaContrattualeRepository";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";

jest.setTimeout(15_000);

describe("PostgresTipologiaContrattualeRepository", () => {
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

  test("non espone una tipologia priva di articoli", async () => {
    const risultato = await database.client.query<{ id: number }>(`
      INSERT INTO tipologia_contrattuale (denominazione, durata, rinnovo)
      VALUES ('Tipologia senza articoli', 3, 2)
      RETURNING id
    `);
    const id = risultato.rows[0]?.id;

    if (id === undefined) {
      throw new Error("Inserimento tipologia non riuscito");
    }

    const repository = new PostgresTipologiaContrattualeRepository(
      database.client,
    );

    await expect(repository.trovaPerIdConArticoli(id)).resolves.toBeNull();
    await expect(repository.trovaTutte()).resolves.toEqual([]);
  });
});
