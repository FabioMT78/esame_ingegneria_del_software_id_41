import RegistraPagamentoService from "../../../src/application/RegistraPagamentoService";
import PostgresContrattoRepository from "../../../src/infrastructure/persistence/postgres/PostgresContrattoRepository";
import PostgresImmobileRepository from "../../../src/infrastructure/persistence/postgres/PostgresImmobileRepository";
import PostgresPagamentoRepository from "../../../src/infrastructure/persistence/postgres/PostgresPagamentoRepository";
import { creaApp } from "../../../src/web/app";
import HttpTestServer from "../../support/HttpTestServer";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";
import {
  creaScenarioRepository,
  inserisciContrattoFixture,
} from "../../support/PostgresRepositoryFixture";

jest.setTimeout(15_000);

class DataCorrenteProviderFake {
  constructor(private readonly data: Date) {}

  oggi(): Date {
    return new Date(this.data.getTime());
  }
}

describe("UC-02 end-to-end HTTP + application + PostgreSQL", () => {
  let database: PostgresTestDatabase;
  let server: HttpTestServer;
  let contrattoId: number;
  let immobileId: number;
  let inquilinoId: number;

  beforeAll(async () => {
    database = await PostgresTestDatabase.crea();
  });

  beforeEach(async () => {
    await database.reset();

    const scenario = await creaScenarioRepository(database.client);
    immobileId = scenario.immobileId;
    inquilinoId = scenario.inquilinoId;
    contrattoId = await inserisciContrattoFixture(
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
        VALUES ($1, 2026, 6, DATE '2026-06-15', 507.07)
      `,
      [contrattoId],
    );

    const immobileRepository = new PostgresImmobileRepository(database.client);
    const contrattoRepository = new PostgresContrattoRepository(database.client);
    const pagamentoRepository = new PostgresPagamentoRepository(database.client);
    const service = new RegistraPagamentoService(
      immobileRepository,
      contrattoRepository,
      pagamentoRepository,
      new DataCorrenteProviderFake(
        new Date("2026-09-10T00:00:00.000Z"),
      ),
    );

    server = await HttpTestServer.avvia(
      creaApp({ registraPagamentoService: service }),
    );
  });

  afterEach(async () => {
    await server.chiudi();
  });

  afterAll(async () => {
    await database.chiudi();
  });

  test("registra la mensilità più vecchia attraversando HTTP, service e PostgreSQL", async () => {
    const immobiliResponse = await fetch(
      `${server.baseUrl}/api/pagamenti/immobili`,
    );
    const immobili = await immobiliResponse.json();

    expect(immobiliResponse.status).toBe(200);
    expect(immobili).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: immobileId, nome: "Casa Roma" }),
      ]),
    );

    const inquiliniResponse = await fetch(
      `${server.baseUrl}/api/pagamenti/immobili/${immobileId}/inquilini`,
    );
    const inquilini = await inquiliniResponse.json();

    expect(inquiliniResponse.status).toBe(200);
    expect(inquilini).toEqual([
      expect.objectContaining({ id: inquilinoId }),
    ]);

    const anteprimaResponse = await fetch(
      `${server.baseUrl}/api/pagamenti/anteprima?immobileId=${immobileId}&inquilinoId=${inquilinoId}`,
    );
    const anteprima = await anteprimaResponse.json();

    expect(anteprimaResponse.status).toBe(200);
    expect(anteprima).toMatchObject({
      contrattoId,
      annoCompetenza: 2026,
      meseCompetenza: 7,
      canoneMensile: 950.75,
      importo: 950.75,
      scadenza: "2026-07-15",
      dovuta: true,
      tardivo: true,
    });

    const confermaResponse = await fetch(
      `${server.baseUrl}/api/pagamenti/conferma`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contrattoId,
          annoCompetenza: 2026,
          meseCompetenza: 7,
        }),
      },
    );
    const pagamento = await confermaResponse.json();

    expect(confermaResponse.status).toBe(201);
    expect(pagamento).toMatchObject({
      annoCompetenza: 2026,
      meseCompetenza: 7,
      dataPagamento: "2026-09-10",
      importo: 950.75,
    });

    const persistiti = await database.client.query<{
      anno_competenza: number;
      mese_competenza: number;
      data_pagamento: string;
      importo: string;
    }>(
      `
        SELECT
          anno_competenza,
          mese_competenza,
          data_pagamento::text AS data_pagamento,
          importo::text AS importo
        FROM pagamento
        WHERE contratto_id = $1
        ORDER BY anno_competenza, mese_competenza
      `,
      [contrattoId],
    );

    expect(persistiti.rows).toEqual([
      {
        anno_competenza: 2026,
        mese_competenza: 6,
        data_pagamento: "2026-06-15",
        importo: "507.07",
      },
      {
        anno_competenza: 2026,
        mese_competenza: 7,
        data_pagamento: "2026-09-10",
        importo: "950.75",
      },
    ]);
  });

  test("rifiuta una preview diventata obsoleta senza creare un secondo pagamento", async () => {
    const anteprimaResponse = await fetch(
      `${server.baseUrl}/api/pagamenti/anteprima?immobileId=${immobileId}&inquilinoId=${inquilinoId}`,
    );
    const anteprima = await anteprimaResponse.json();

    expect(anteprimaResponse.status).toBe(200);
    expect(anteprima).toMatchObject({
      contrattoId,
      annoCompetenza: 2026,
      meseCompetenza: 7,
    });

    await database.client.query(
      `
        INSERT INTO pagamento (
          contratto_id,
          anno_competenza,
          mese_competenza,
          data_pagamento,
          importo
        )
        VALUES ($1, 2026, 7, DATE '2026-09-09', 950.75)
      `,
      [contrattoId],
    );

    const confermaResponse = await fetch(
      `${server.baseUrl}/api/pagamenti/conferma`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contrattoId,
          annoCompetenza: 2026,
          meseCompetenza: 7,
        }),
      },
    );
    const errore = await confermaResponse.json();

    expect(confermaResponse.status).toBe(409);
    expect(errore).toEqual({
      errore:
        "La competenza da confermare non è più registrabile; aggiornare l'anteprima",
    });

    const conteggio = await database.client.query<{
      luglio: number;
      agosto: number;
    }>(
      `
        SELECT
          COUNT(*) FILTER (
            WHERE anno_competenza = 2026 AND mese_competenza = 7
          )::int AS luglio,
          COUNT(*) FILTER (
            WHERE anno_competenza = 2026 AND mese_competenza = 8
          )::int AS agosto
        FROM pagamento
        WHERE contratto_id = $1
      `,
      [contrattoId],
    );

    expect(conteggio.rows[0]).toEqual({
      luglio: 1,
      agosto: 0,
    });
  });
});
