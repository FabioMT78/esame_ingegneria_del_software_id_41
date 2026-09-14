import PostgresContrattoRepository from "../../../src/infrastructure/persistence/postgres/PostgresContrattoRepository";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";
import {
  creaScenarioRepository,
  inserisciContrattoFixture,
} from "../../support/PostgresRepositoryFixture";

jest.setTimeout(15_000);

describe("PostgresContrattoRepository", () => {
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

  test("ricostruisce il contratto persistito con al storico, contenuto e pagamenti", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const contrattoId = await inserisciContrattoFixture(
      database.client,
      scenario,
    );

    await database.client.query(
      `
        INSERT INTO pagamento (
          contratto_id,
          anno_competenza,
          mese_competenza,
          data_pagamento,
          importo
        )
        VALUES
          ($1, 2026, 6, DATE '2026-06-15', 506.67),
          ($1, 2026, 7, DATE '2026-07-15', 950.75)
      `,
      [contrattoId],
    );

    const repository = new PostgresContrattoRepository(database.client);
    const contratto = await repository.trovaPerId(contrattoId);

    expect(contratto?.al.toISOString()).toBe("2029-06-14T00:00:00.000Z");
    expect(contratto?.canoneMensile).toBe(950.75);
    expect(contratto?.contenuto).toBe(
      "<article>Contenuto storico</article>",
    );
    expect(contratto?.immobile.id).toBe(scenario.immobileId);
    expect(contratto?.inquilino.documento?.numero).toBe("CA7654321");
    expect(contratto?.tipologia.articoli).toHaveLength(3);
    expect(contratto?.pagamenti.map((pagamento) => pagamento.importo)).toEqual([
      506.67,
      950.75,
    ]);
  });

  test("trova i contratti per immobile", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const contrattoId = await inserisciContrattoFixture(
      database.client,
      scenario,
    );
    const repository = new PostgresContrattoRepository(database.client);

    const contratti = await repository.trovaPerImmobile(scenario.immobileId);

    expect(contratti.map((contratto) => contratto.id)).toEqual([
      contrattoId,
    ]);
  });

  test("verifica la sovrapposizione con estremi inclusivi", async () => {
    const scenario = await creaScenarioRepository(database.client);
    await inserisciContrattoFixture(database.client, scenario);
    const repository = new PostgresContrattoRepository(database.client);

    await expect(
      repository.esisteSovrapposizione(
        scenario.immobileId,
        new Date(Date.UTC(2026, 4, 1)),
        new Date(Date.UTC(2026, 5, 14)),
      ),
    ).resolves.toBe(false);

    await expect(
      repository.esisteSovrapposizione(
        scenario.immobileId,
        new Date(Date.UTC(2029, 5, 14)),
        new Date(Date.UTC(2030, 0, 1)),
      ),
    ).resolves.toBe(true);

    await expect(
      repository.esisteSovrapposizione(
        scenario.immobileId,
        new Date(Date.UTC(2029, 5, 15)),
        new Date(Date.UTC(2030, 0, 1)),
      ),
    ).resolves.toBe(false);
  });
});
