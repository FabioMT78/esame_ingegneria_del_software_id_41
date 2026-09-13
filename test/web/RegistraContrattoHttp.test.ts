import Articolo from "../../src/domain/Articolo";
import DatiCatastali from "../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Persona from "../../src/domain/Persona";
import TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";
import BozzaContratto from "../../src/application/model/BozzaContratto";
import {
  ConflittoApplicativo,
  RisorsaNonTrovata,
} from "../../src/application/errors/ApplicationError";
import { creaApp } from "../../src/web/app";
import type { RegistraContrattoHttpService } from "../../src/web/RegistraContrattoController";
import HttpTestServer from "../support/HttpTestServer";

type ServiceMock = jest.Mocked<RegistraContrattoHttpService>;

function creaServiceMock(): ServiceMock {
  return {
    avvia: jest.fn(),
    elencaImmobili: jest.fn(),
    elencaTipologie: jest.fn(),
    selezionaImmobile: jest.fn(),
    inserisciNuovoImmobile: jest.fn(),
    cercaPersona: jest.fn(),
    impostaProprietario: jest.fn(),
    impostaInquilino: jest.fn(),
    impostaDatiContrattuali: jest.fn(),
    conferma: jest.fn(),
    annulla: jest.fn(),
  } as unknown as ServiceMock;
}

function creaImmobile(id = 7): Immobile {
  return new Immobile({
    id,
    nome: "Casa Roma",
    indirizzo: new Indirizzo({
      id: 10,
      nazione: "Italia",
      provincia: "RM",
      comune: "Roma",
      cap: "00100",
      indirizzo: "Via delle Rose",
      civico: "10",
      scala: "A",
      interno: "3",
    }),
    datiCatastali: new DatiCatastali({
      id: 20,
      codiceComunale: "H501",
      foglio: 12,
      particella: 345,
      subalterno: 7,
      categoria: "A/2",
      consistenza: 5.5,
      rendita: 987.65,
    }),
  });
}

function creaPersona(id = 11, conDocumento = true): Persona {
  const persona = new Persona({
    id,
    nome: "Giulia",
    cognome: "Verdi",
    luogoNascita: "Roma",
    dataNascita: new Date(Date.UTC(1990, 1, 20)),
    codiceFiscale: "VRDGLI90B60H501Z",
    residenza: new Indirizzo({
      id: 12,
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Residenza",
      civico: "4",
    }),
  });

  if (conDocumento) {
    persona.impostaDocumentoRiconoscimento(
      new DocumentoRiconoscimento({
        id: 13,
        tipo: "carta d'identità",
        organoEmittente: "Comune di Roma",
        dataRilascio: new Date(Date.UTC(2025, 0, 10)),
        dataScadenza: new Date(Date.UTC(2035, 0, 10)),
        numero: "CA1234567",
      }),
    );
  }

  return persona;
}

function creaTipologia(): TipologiaContrattuale {
  return new TipologiaContrattuale({
    id: 2,
    denominazione: "Canone concordato",
    durata: 3,
    rinnovo: 2,
    articoli: [
      new Articolo({
        id: 21,
        numArticolo: 1,
        numParte: 0,
        titolo: "Oggetto",
        descrizione: "Testo template",
      }),
    ],
  });
}

function creaBozzaCompleta(): BozzaContratto {
  return new BozzaContratto({
    idBozza: 3,
    stepCompletato: 4,
    immobile: creaImmobile(),
    proprietario: creaPersona(14, false),
    inquilino: creaPersona(),
    tipologia: creaTipologia(),
    nomeDescrizione: "Contratto Verdi",
    dal: new Date(Date.UTC(2026, 5, 15)),
    al: new Date(Date.UTC(2029, 5, 14)),
    canoneMensile: 950.75,
    giornoPagamento: 15,
  });
}

async function leggiJson(risposta: Response): Promise<unknown> {
  return risposta.json() as Promise<unknown>;
}

describe("HTTP UC-01", () => {
  let service: ServiceMock;
  let server: HttpTestServer;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    service = creaServiceMock();
    service.avvia.mockResolvedValue([]);
    service.elencaImmobili.mockResolvedValue([]);
    service.elencaTipologie.mockResolvedValue([]);
    service.cercaPersona.mockResolvedValue(null);
    service.conferma.mockResolvedValue(undefined);
    service.annulla.mockResolvedValue(undefined);

    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    server = await HttpTestServer.avvia(
      creaApp({ registraContrattoService: service }),
    );
  });

  afterEach(async () => {
    await server.chiudi();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("espone bozze usando date di calendario YYYY-MM-DD", async () => {
    service.avvia.mockResolvedValue([creaBozzaCompleta()]);

    const risposta = await fetch(`${server.baseUrl}/api/contratti/bozze`);
    const body = (await leggiJson(risposta)) as Array<Record<string, unknown>>;

    expect(risposta.status).toBe(200);
    expect(body[0]?.dal).toBe("2026-06-15");
    expect(body[0]?.al).toBe("2029-06-14");

    const inquilino = body[0]?.inquilino as Record<string, unknown>;
    const documento = inquilino.documento as Record<string, unknown>;
    expect(inquilino.dataNascita).toBe("1990-02-20");
    expect(documento.dataScadenza).toBe("2035-01-10");
  });

  test("espone immobili, tipologie e ricerca persona", async () => {
    const immobile = creaImmobile();
    const tipologia = creaTipologia();
    const persona = creaPersona();
    service.elencaImmobili.mockResolvedValue([immobile]);
    service.elencaTipologie.mockResolvedValue([tipologia]);
    service.cercaPersona.mockResolvedValue(persona);

    const [rispostaImmobili, rispostaTipologie, rispostaPersona] =
      await Promise.all([
        fetch(`${server.baseUrl}/api/immobili`),
        fetch(`${server.baseUrl}/api/tipologie-contrattuali`),
        fetch(`${server.baseUrl}/api/persone/VRDGLI90B60H501Z`),
      ]);

    expect(rispostaImmobili.status).toBe(200);
    expect(rispostaTipologie.status).toBe(200);
    expect(rispostaPersona.status).toBe(200);
    expect(service.cercaPersona).toHaveBeenCalledWith("VRDGLI90B60H501Z");

    const personaJson = (await leggiJson(rispostaPersona)) as Record<
      string,
      unknown
    >;
    expect(personaJson.dataNascita).toBe("1990-02-20");
  });

  test("seleziona un immobile esistente mantenendo opzionale idBozza", async () => {
    const bozza = new BozzaContratto({
      idBozza: 3,
      stepCompletato: 1,
      immobile: creaImmobile(),
    });
    service.selezionaImmobile.mockResolvedValue(bozza);

    const risposta = await fetch(
      `${server.baseUrl}/api/contratti/bozze/immobile-esistente`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ immobileId: 7, idBozza: 3 }),
      },
    );

    expect(risposta.status).toBe(200);
    expect(service.selezionaImmobile).toHaveBeenCalledWith(7, 3);
  });

  test("trasforma il JSON di un nuovo immobile in oggetti di dominio", async () => {
    service.inserisciNuovoImmobile.mockImplementation(
      async (immobile, idBozza) =>
        new BozzaContratto({
          ...(idBozza !== undefined ? { idBozza } : { idBozza: 1 }),
          stepCompletato: 1,
          immobile,
        }),
    );

    const risposta = await fetch(
      `${server.baseUrl}/api/contratti/bozze/immobile-nuovo`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          immobile: {
            nome: "Casa Bologna",
            indirizzo: {
              provincia: "BO",
              comune: "Bologna",
              indirizzo: "Via Nuova",
              civico: "8",
              interno: "2",
            },
            datiCatastali: {
              codiceComunale: "A944",
              foglio: 2,
              particella: 44,
              subalterno: 5,
              categoria: "A/3",
              consistenza: 4.5,
              rendita: 700.25,
            },
          },
        }),
      },
    );

    expect(risposta.status).toBe(200);
    const immobileRicevuto = service.inserisciNuovoImmobile.mock.calls[0]?.[0];
    expect(immobileRicevuto).toBeInstanceOf(Immobile);
    expect(immobileRicevuto?.indirizzo).toBeInstanceOf(Indirizzo);
    expect(immobileRicevuto?.datiCatastali).toBeInstanceOf(DatiCatastali);
    expect(immobileRicevuto?.indirizzo.interno).toBe("2");
    expect(service.inserisciNuovoImmobile.mock.calls[0]?.[1]).toBeUndefined();
  });

  test("trasforma proprietario e inquilino preservando id e documento", async () => {
    const rispostaBozza = new BozzaContratto({
      idBozza: 3,
      stepCompletato: 3,
    });
    service.impostaProprietario.mockResolvedValue(rispostaBozza);
    service.impostaInquilino.mockResolvedValue(rispostaBozza);

    const personaJson = {
      id: 11,
      nome: "Giulia",
      cognome: "Verdi",
      luogoNascita: "Roma",
      dataNascita: "1990-02-20",
      codiceFiscale: "VRDGLI90B60H501Z",
      residenza: {
        id: 12,
        provincia: "RM",
        comune: "Roma",
        indirizzo: "Via Residenza",
      },
      documento: {
        id: 13,
        tipo: "carta d'identità",
        organoEmittente: "Comune di Roma",
        dataRilascio: "2025-01-10",
        dataScadenza: "2035-01-10",
        numero: "CA1234567",
      },
    };

    const rispostaProprietario = await fetch(
      `${server.baseUrl}/api/contratti/bozze/3/proprietario`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona: personaJson }),
      },
    );
    const rispostaInquilino = await fetch(
      `${server.baseUrl}/api/contratti/bozze/3/inquilino`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona: personaJson }),
      },
    );

    expect(rispostaProprietario.status).toBe(200);
    expect(rispostaInquilino.status).toBe(200);

    const personaRicevuta = service.impostaInquilino.mock.calls[0]?.[1];
    expect(personaRicevuta).toBeInstanceOf(Persona);
    expect(personaRicevuta?.id).toBe(11);
    expect(personaRicevuta?.dataNascita.toISOString()).toBe(
      "1990-02-20T00:00:00.000Z",
    );
    expect(personaRicevuta?.documento).toBeInstanceOf(
      DocumentoRiconoscimento,
    );
  });

  test("converte dal in Date UTC e inoltra i dati contrattuali", async () => {
    const bozza = creaBozzaCompleta();
    service.impostaDatiContrattuali.mockResolvedValue(bozza);

    const risposta = await fetch(
      `${server.baseUrl}/api/contratti/bozze/3/dati-contrattuali`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nomeDescrizione: "Contratto Verdi",
          tipologiaId: 2,
          dal: "2026-06-15",
          canoneMensile: 950.75,
          giornoPagamento: 15,
        }),
      },
    );

    expect(risposta.status).toBe(200);
    expect(service.impostaDatiContrattuali).toHaveBeenCalledTimes(1);
    const chiamata = service.impostaDatiContrattuali.mock.calls[0];
    expect(chiamata?.[0]).toBe(3);
    expect(chiamata?.[1]).toBe("Contratto Verdi");
    expect(chiamata?.[2]).toBe(2);
    expect(chiamata?.[3]?.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(chiamata?.[4]).toBe(950.75);
    expect(chiamata?.[5]).toBe(15);
  });

  test("conferma e annulla una specifica bozza", async () => {
    const rispostaConferma = await fetch(
      `${server.baseUrl}/api/contratti/bozze/3/conferma`,
      { method: "POST" },
    );
    const rispostaAnnulla = await fetch(
      `${server.baseUrl}/api/contratti/bozze/4`,
      { method: "DELETE" },
    );

    expect(rispostaConferma.status).toBe(204);
    expect(rispostaAnnulla.status).toBe(204);
    expect(service.conferma).toHaveBeenCalledWith(3);
    expect(service.annulla).toHaveBeenCalledWith(4);
  });

  test("rifiuta una data HTTP non valida prima di invocare il Service", async () => {
    const risposta = await fetch(
      `${server.baseUrl}/api/contratti/bozze/3/dati-contrattuali`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nomeDescrizione: "Contratto",
          tipologiaId: 2,
          dal: "2026-02-30",
          canoneMensile: 900,
          giornoPagamento: 15,
        }),
      },
    );

    expect(risposta.status).toBe(400);
    expect(service.impostaDatiContrattuali).not.toHaveBeenCalled();
  });

  test.each([
    [new RisorsaNonTrovata("Immobile non trovato"), 404],
    [new ConflittoApplicativo("Bozza già presente"), 409],
    [new RangeError("Giorno di pagamento non valido"), 400],
  ])("traduce gli errori applicativi in HTTP", async (errore, stato) => {
    service.selezionaImmobile.mockRejectedValue(errore);

    const risposta = await fetch(
      `${server.baseUrl}/api/contratti/bozze/immobile-esistente`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ immobileId: 7 }),
      },
    );

    expect(risposta.status).toBe(stato);
    const body = (await leggiJson(risposta)) as Record<string, unknown>;
    expect(body.errore).toBe(errore.message);
  });

  test("non espone dettagli tecnici per un errore inatteso", async () => {
    service.avvia.mockRejectedValue(new Error("connessione DB fallita"));

    const risposta = await fetch(`${server.baseUrl}/api/contratti/bozze`);
    const body = (await leggiJson(risposta)) as Record<string, unknown>;

    expect(risposta.status).toBe(500);
    expect(body).toEqual({ errore: "Errore interno del server" });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("App senza wiring UC-01", () => {
  test("mantiene disponibile il health check nel bootstrap intermedio", async () => {
    const server = await HttpTestServer.avvia(creaApp());

    try {
      const risposta = await fetch(`${server.baseUrl}/health`);
      expect(risposta.status).toBe(200);
      await expect(risposta.json()).resolves.toEqual({ status: "ok" });
    } finally {
      await server.chiudi();
    }
  });
});
