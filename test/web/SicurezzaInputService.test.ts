import {
  ErroreInputSospetto,
  SicurezzaInputService,
} from "../../src/web/SicurezzaInputService";

describe("SicurezzaInputService", () => {
  const service = new SicurezzaInputService();

  test.each([
    ["script XSS", "<script>alert(1)</script>"],
    ["URI javascript", "javascript:alert(1)"],
    ["event handler", "<img src=x onerror=alert(1)>"],
    ["iframe", "<iframe src=\"evil\"></iframe>"],
    ["data URI HTML", "data:text/html,<script>alert(1)</script>"],
    ["UNION SELECT", "' UNION SELECT password FROM utenti"],
    ["tautologia SQL", "' OR 1=1"],
    ["commento SQL", "' --"],
    ["statement distruttivo", "DROP TABLE persona"],
    ["statement concatenato", "Mario; DELETE FROM persona"],
  ])("rifiuta %s", (_descrizione, valore) => {
    expect(() => service.verifica(valore)).toThrow(
      ErroreInputSospetto,
    );
  });

  test.each([
    "D'Angelo",
    "Via dell'Università",
    "Union Street",
    "Via Scriptoria 10",
    "Mario & Figli",
  ])("non rifiuta una stringa legittima: %s", (valore) => {
    expect(service.verifica(valore)).toBe(valore);
  });

  test("analizza ricorsivamente oggetti e array", () => {
    const input = {
      persona: {
        nome: "Mario",
        indirizzi: [
          {
            via: "Via Roma",
          },
          {
            via: "<script>alert(1)</script>",
          },
        ],
      },
    };

    try {
      service.verifica(input, "body");
      throw new Error("Il test avrebbe dovuto rilevare l'input sospetto");
    } catch (errore) {
      expect(errore).toBeInstanceOf(ErroreInputSospetto);

      if (!(errore instanceof ErroreInputSospetto)) {
        return;
      }

      expect(errore.rilevazione.percorso).toBe(
        "body.persona.indirizzi[1].via",
      );
      expect(errore.rilevazione.categoria).toBe("XSS");

      expect(errore.rilevazione.valorePerLog).not.toContain(
        "<script>",
      );
      expect(errore.rilevazione.valorePerLog).toContain(
        "\\u003Cscript",
      );
    }
  });
});
