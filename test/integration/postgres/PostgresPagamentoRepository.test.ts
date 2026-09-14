import PostgresContrattoRepository from "../../../src/infrastructure/persistence/postgres/PostgresContrattoRepository";
import PostgresPagamentoRepository from "../../../src/infrastructure/persistence/postgres/PostgresPagamentoRepository";
import Pagamento from "../../../src/domain/Pagamento";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";
import {
  creaScenarioRepository,
  inserisciContrattoFixture,
} from "../../support/PostgresRepositoryFixture";

jest.setTimeout(15_000);

describe("PostgresPagamentoRepository", () => {
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

  test("salva il pagamento con competenza, data e importo corretti", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const contrattoId = await inserisciContrattoFixture(
      database.client,
      scenario,
    );
    const repository = new PostgresPagamentoRepository(database.client);
    const pagamento = new Pagamento({
      annoCompetenza: 2026,
      meseCompetenza: 7,
      dataPagamento: new Date("2026-07-10T00:00:00.000Z"),
      importo: 950.75,
    });

    await repository.salva(contrattoId, pagamento);

    const risultato = await database.client.query<{
      contratto_id: number;
      anno_competenza: number;
      mese_competenza: number;
      data_pagamento: string;
      importo: string;
    }>(
      `
        SELECT
          contratto_id,
          anno_competenza,
          mese_competenza,
          data_pagamento::text AS data_pagamento,
          importo::text AS importo
        FROM pagamento
        WHERE contratto_id = $1
      `,
      [contrattoId],
    );

    expect(risultato.rows).toEqual([
      {
        contratto_id: contrattoId,
        anno_competenza: 2026,
        mese_competenza: 7,
        data_pagamento: "2026-07-10",
        importo: "950.75",
      },
    ]);

    const contrattoRepository = new PostgresContrattoRepository(
      database.client,
    );
    const contratto = await contrattoRepository.trovaPerId(contrattoId);

    expect(contratto?.pagamenti).toHaveLength(1);
    expect(contratto?.pagamenti[0]).toMatchObject({
      annoCompetenza: 2026,
      meseCompetenza: 7,
      importo: 950.75,
    });
    expect(contratto?.pagamenti[0]?.dataPagamento).toEqual(
      new Date("2026-07-10T00:00:00.000Z"),
    );
  });

  test("il vincolo PostgreSQL impedisce due pagamenti per la stessa competenza", async () => {
    const scenario = await creaScenarioRepository(database.client);
    const contrattoId = await inserisciContrattoFixture(
      database.client,
      scenario,
    );
    const repository = new PostgresPagamentoRepository(database.client);

    const primoPagamento = new Pagamento({
      annoCompetenza: 2026,
      meseCompetenza: 7,
      dataPagamento: new Date("2026-07-10T00:00:00.000Z"),
      importo: 950.75,
    });
    const secondoPagamento = new Pagamento({
      annoCompetenza: 2026,
      meseCompetenza: 7,
      dataPagamento: new Date("2026-07-11T00:00:00.000Z"),
      importo: 950.75,
    });

    await repository.salva(contrattoId, primoPagamento);

    await expect(
      repository.salva(contrattoId, secondoPagamento),
    ).rejects.toMatchObject({
      code: "23505",
    });

    const conteggio = await database.client.query<{ totale: number }>(
      `
        SELECT COUNT(*)::int AS totale
        FROM pagamento
        WHERE contratto_id = $1
          AND anno_competenza = 2026
          AND mese_competenza = 7
      `,
      [contrattoId],
    );

    expect(conteggio.rows[0]?.totale).toBe(1);
  });
});
