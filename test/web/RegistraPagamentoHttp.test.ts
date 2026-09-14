import PagamentoDaRegistrare from "../../src/application/model/PagamentoDaRegistrare";
import { ConflittoApplicativo } from "../../src/application/errors/ApplicationError";
import DatiCatastali from "../../src/domain/DatiCatastali";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Pagamento from "../../src/domain/Pagamento";
import Persona from "../../src/domain/Persona";
import type { RegistraPagamentoHttpService } from "../../src/web/RegistraPagamentoController";
import { creaApp } from "../../src/web/app";
import HttpTestServer from "../support/HttpTestServer";

function creaImmobile(id: number, nome = "Casa"): Immobile {
  return new Immobile({
    id,
    nome,
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: `Via Immobile ${id}`,
      civico: String(id),
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: id,
      particella: id,
      subalterno: 1,
      categoria: "A/2",
      consistenza: 5,
      rendita: 700,
    }),
  });
}

function creaInquilino(id: number): Persona {
  return new Persona({
    id,
    nome: "Luigi",
    cognome: "Verdi",
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-01T00:00:00.000Z"),
    codiceFiscale: "VRDLGI80A01H501X",
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Residenza",
      civico: "4",
    }),
  });
}

function creaAnteprima(): PagamentoDaRegistrare {
  return new PagamentoDaRegistrare({
    contrattoId: 10,
    canoneMensile: 1000,
    tipologiaDenominazione: "Canone concordato",
    dal: new Date("2026-06-15T00:00:00.000Z"),
    al: new Date("2029-06-14T00:00:00.000Z"),
    annoCompetenza: 2026,
    meseCompetenza: 7,
    scadenza: new Date("2026-07-15T00:00:00.000Z"),
    importo: 1000,
    dovuta: true,
    tardivo: true,
  });
}

describe("API HTTP UC-02", () => {
  let server: HttpTestServer;
  let ultimaAnteprima: { immobileId: number; inquilinoId: number } | null;
  let ultimaConferma: {
    contrattoId: number;
    annoCompetenza: number;
    meseCompetenza: number;
  } | null;
  let erroreConferma: Error | null;

  beforeEach(async () => {
    ultimaAnteprima = null;
    ultimaConferma = null;
    erroreConferma = null;

    const service: RegistraPagamentoHttpService = {
      elencaImmobili: async () => [
        creaImmobile(1, "Casa"),
        creaImmobile(2, "Casa"),
      ],
      elencaInquilini: async () => [creaInquilino(7)],
      preparaPagamento: async (immobileId, inquilinoId) => {
        ultimaAnteprima = { immobileId, inquilinoId };
        return creaAnteprima();
      },
      confermaPagamento: async (
        contrattoId,
        annoCompetenza,
        meseCompetenza,
      ) => {
        ultimaConferma = {
          contrattoId,
          annoCompetenza,
          meseCompetenza,
        };

        if (erroreConferma !== null) {
          throw erroreConferma;
        }

        return new Pagamento({
          annoCompetenza,
          meseCompetenza,
          dataPagamento: new Date("2026-09-14T00:00:00.000Z"),
          importo: 1000,
        });
      },
    };

    server = await HttpTestServer.avvia(
      creaApp({ registraPagamentoService: service }),
    );
  });

  afterEach(async () => {
    await server.chiudi();
  });

  test("espone gli immobili mantenendo il riferimento univoco", async () => {
    const response = await fetch(`${server.baseUrl}/api/pagamenti/immobili`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject([
      { id: 1, nome: "Casa" },
      { id: 2, nome: "Casa" },
    ]);
  });

  test("espone gli inquilini associati all'immobile", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/pagamenti/immobili/1/inquilini`,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      {
        id: 7,
        nome: "Luigi",
        cognome: "Verdi",
        codiceFiscale: "VRDLGI80A01H501X",
      },
    ]);
  });

  test("restituisce l'anteprima con date di calendario serializzate", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/pagamenti/anteprima?immobileId=1&inquilinoId=7`,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(ultimaAnteprima).toEqual({
      immobileId: 1,
      inquilinoId: 7,
    });
    expect(body).toMatchObject({
      contrattoId: 10,
      annoCompetenza: 2026,
      meseCompetenza: 7,
      dal: "2026-06-15",
      al: "2029-06-14",
      scadenza: "2026-07-15",
      importo: 1000,
      dovuta: true,
      tardivo: true,
    });
  });

  test("conferma il pagamento e restituisce il fatto registrato", async () => {
    const response = await fetch(`${server.baseUrl}/api/pagamenti/conferma`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contrattoId: 10,
        annoCompetenza: 2026,
        meseCompetenza: 7,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(ultimaConferma).toEqual({
      contrattoId: 10,
      annoCompetenza: 2026,
      meseCompetenza: 7,
    });
    expect(body).toEqual({
      id: null,
      annoCompetenza: 2026,
      meseCompetenza: 7,
      dataPagamento: "2026-09-14",
      importo: 1000,
    });
  });

  test("rifiuta input HTTP non validi prima di invocare il service", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/pagamenti/anteprima?immobileId=abc&inquilinoId=7`,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      errore: "immobileId deve essere un intero maggiore di zero",
    });
    expect(ultimaAnteprima).toBeNull();
  });

  test("traduce un conflitto applicativo in HTTP 409", async () => {
    erroreConferma = new ConflittoApplicativo(
      "La competenza non è più registrabile",
    );

    const response = await fetch(`${server.baseUrl}/api/pagamenti/conferma`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contrattoId: 10,
        annoCompetenza: 2026,
        meseCompetenza: 7,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      errore: "La competenza non è più registrabile",
    });
  });
});
