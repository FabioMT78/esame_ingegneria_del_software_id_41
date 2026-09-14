import { creaApp } from "../../src/web/app";
import HttpTestServer from "../support/HttpTestServer";

describe("asset statici frontend", () => {
  let server: HttpTestServer;

  beforeAll(async () => {
    server = await HttpTestServer.avvia(creaApp());
  });

  afterAll(async () => {
    await server.chiudi();
  });

  test("serve la pagina principale con i cinque step di UC-01", async () => {
    const response = await fetch(`${server.baseUrl}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("Registrazione contratto di locazione");
    expect(body).toContain('id="step1-panel"');
    expect(body).toContain('id="step2-panel"');
    expect(body).toContain('id="step3-panel"');
    expect(body).toContain('id="step4-panel"');
    expect(body).toContain('id="step5-panel"');
    expect(body).not.toContain('id="step6-panel"');
    expect(body).toContain('id="proprietario-nuovo"');
    expect(body).toContain('id="inquilino-nuovo"');
    expect(body).toContain('id="riepilogo-conferma"');
    expect(body).toContain('id="salva-bozza"');
    expect(body).toContain('id="riepilogo-annulla"');
    expect(body).toContain('id="riepilogo-anteprima"');
    expect(body).toContain('aria-label="Anteprima degli articoli contrattuali"');
    expect(body).not.toContain("<iframe");
  });

  test("serve la pagina dedicata alla registrazione dei pagamenti", async () => {
    const response = await fetch(`${server.baseUrl}/pagamenti.html`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("Registrazione pagamento del canone");
    expect(body).toContain('id="pagamento-immobile"');
    expect(body).toContain('id="pagamento-inquilino"');
    expect(body).toContain('id="anteprima-panel"');
    expect(body).toContain('id="pagamento-pagato"');
    expect(body).toContain('id="pagamento-annulla"');
    expect(body).toContain('id="conferma-pagamento"');
  });

  test("mantiene realmente nascosti gli elementi marcati hidden", async () => {
    const response = await fetch(`${server.baseUrl}/css/app.css`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("[hidden]");
    expect(body).toContain("display: none !important;");
  });

  test.each([
    ["/css/app.css", "text/css"],
    ["/js/app.js", "text/javascript"],
    ["/js/api.js", "text/javascript"],
    ["/js/personaForm.js", "text/javascript"],
    ["/js/pagamenti.js", "text/javascript"],
  ])("serve %s", async (path, contentType) => {
    const response = await fetch(`${server.baseUrl}${path}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(contentType);
    expect((await response.text()).length).toBeGreaterThan(0);
  });
});
