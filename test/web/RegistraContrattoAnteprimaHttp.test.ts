import type { RegistraContrattoHttpService } from "../../src/web/RegistraContrattoController";
import { creaApp } from "../../src/web/app";
import HttpTestServer from "../support/HttpTestServer";

function nonUsato(): never {
  throw new Error("Metodo non usato nel test");
}

describe("API HTTP UC-01 - anteprima", () => {
  let server: HttpTestServer;

  beforeAll(async () => {
    const service: RegistraContrattoHttpService = {
      avvia: async () => [],
      elencaImmobili: async () => [],
      elencaTipologie: async () => [],
      selezionaImmobile: async () => nonUsato(),
      inserisciNuovoImmobile: async () => nonUsato(),
      cercaPersona: async () => null,
      cercaPersonaPerBozza: async () => null,
      impostaProprietario: async () => nonUsato(),
      impostaInquilino: async () => nonUsato(),
      impostaDatiContrattuali: async () => nonUsato(),
      anteprima: async (idBozza) =>
        `<section data-bozza="${idBozza}"><article>Testo valorizzato</article></section>`,
      conferma: async () => undefined,
      annulla: async () => undefined,
    };

    server = await HttpTestServer.avvia(
      creaApp({ registraContrattoService: service }),
    );
  });

  afterAll(async () => {
    await server.chiudi();
  });

  test("restituisce l'HTML di anteprima della bozza", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/contratti/bozze/7/anteprima`,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('data-bozza="7"');
    expect(html).toContain("Testo valorizzato");
  });
});
