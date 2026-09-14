import { creaApp } from "../../src/web/app";
import HttpTestServer from "../support/HttpTestServer";

describe("Sicurezza input HTTP", () => {
  let server: HttpTestServer;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    server = await HttpTestServer.avvia(creaApp());
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    await server.chiudi();
  });

  test("rifiuta un tentativo XSS ricevuto tramite query string", async () => {
    const payload = encodeURIComponent(
      "<script>alert(1)</script>",
    );

    const response = await fetch(
      `${server.baseUrl}/api/test?ricerca=${payload}`,
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      errore: "Input HTTP non ammesso",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[SECURITY] Input sospetto rifiutato",
      expect.objectContaining({
        metodo: "GET",
        origine: "query.ricerca",
        categoria: "XSS",
        pattern: "XSS_SCRIPT_TAG",
      }),
    );
  });

  test("rifiuta un tentativo SQL injection ricevuto nel body", async () => {
    const response = await fetch(`${server.baseUrl}/api/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        persona: {
          nome: "' OR 1=1",
        },
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      errore: "Input HTTP non ammesso",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[SECURITY] Input sospetto rifiutato",
      expect.objectContaining({
        metodo: "POST",
        origine: "body.persona.nome",
        categoria: "SQL_INJECTION",
        pattern: "SQL_TAUTOLOGY",
      }),
    );
  });

  test("non blocca caratteri legittimi", async () => {
    const valore = encodeURIComponent("D'Angelo");

    const response = await fetch(
      `${server.baseUrl}/api/test?cognome=${valore}`,
    );

    expect(response.status).toBe(404);
  });
});
