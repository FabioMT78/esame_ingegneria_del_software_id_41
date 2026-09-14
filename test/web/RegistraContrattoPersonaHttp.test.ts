import {
  ConflittoApplicativo,
} from "../../src/application/errors/ApplicationError";
import type { RegistraContrattoHttpService } from "../../src/web/RegistraContrattoController";
import { creaApp } from "../../src/web/app";
import Indirizzo from "../../src/domain/Indirizzo";
import Persona from "../../src/domain/Persona";
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
    cercaPersonaPerBozza: jest.fn(),
    impostaProprietario: jest.fn(),
    impostaInquilino: jest.fn(),
    impostaDatiContrattuali: jest.fn(),
    conferma: jest.fn(),
    annulla: jest.fn(),
  } as unknown as ServiceMock;
}

function creaPersona(): Persona {
  return new Persona({
    id: 5,
    nome: "Mario",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-10T00:00:00.000Z"),
    codiceFiscale: "RSSMRA80A10H501U",
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Esempio",
    }),
  });
}

describe("HTTP UC-01 - ricerca persona contestuale alla bozza", () => {
  let service: ServiceMock;
  let server: HttpTestServer;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    service = creaServiceMock();
    service.cercaPersonaPerBozza.mockResolvedValue(creaPersona());

    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    server = await HttpTestServer.avvia(
      creaApp({ registraContrattoService: service }),
    );
  });

  afterEach(async () => {
    await server.chiudi();
    warnSpy.mockRestore();
  });

  test("cerca il proprietario nella bozza indicata", async () => {
    const risposta = await fetch(
      `${server.baseUrl}/api/contratti/bozze/3/proprietario/RSSMRA80A10H501U`,
    );

    expect(risposta.status).toBe(200);
    expect(service.cercaPersonaPerBozza).toHaveBeenCalledWith(
      3,
      "proprietario",
      "RSSMRA80A10H501U",
    );
  });

  test("traduce il conflitto fra proprietario e inquilino in HTTP 409", async () => {
    service.cercaPersonaPerBozza.mockRejectedValue(
      new ConflittoApplicativo(
        "Proprietario e inquilino devono essere persone distinte",
      ),
    );

    const risposta = await fetch(
      `${server.baseUrl}/api/contratti/bozze/3/inquilino/RSSMRA80A10H501U`,
    );
    const body = (await risposta.json()) as Record<string, unknown>;

    expect(risposta.status).toBe(409);
    expect(body.errore).toBe(
      "Proprietario e inquilino devono essere persone distinte",
    );
  });
});
