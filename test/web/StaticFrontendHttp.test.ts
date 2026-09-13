import { creaApp } from "../../src/web/app";
import HttpTestServer from "../support/HttpTestServer";

describe("asset statici frontend UC-01", () => {
  let server: HttpTestServer;

  beforeAll(async () => {
    server = await HttpTestServer.avvia(creaApp());
  });

  afterAll(async () => {
    await server.chiudi();
  });

  test("serve la pagina principale", async () => {
    const response = await fetch(`${server.baseUrl}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("Registrazione contratto di locazione");
    expect(body).toContain('id="step1-panel"');
    expect(body).toContain('id="step2-panel"');
    expect(body).toContain('id="step3-panel"');
  });

  test.each([
    ["/css/app.css", "text/css"],
    ["/js/app.js", "text/javascript"],
    ["/js/api.js", "text/javascript"],
    ["/js/personaForm.js", "text/javascript"],
  ])("serve %s", async (path, contentType) => {
    const response = await fetch(`${server.baseUrl}${path}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(contentType);
    expect((await response.text()).length).toBeGreaterThan(0);
  });
});
