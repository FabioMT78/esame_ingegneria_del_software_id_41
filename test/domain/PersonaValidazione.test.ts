import Indirizzo from "../../src/domain/Indirizzo";
import Persona from "../../src/domain/Persona";

function creaPersona(codiceFiscale: string): Persona {
  return new Persona({
    nome: "Mario",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-10T00:00:00.000Z"),
    codiceFiscale,
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Esempio",
    }),
  });
}

describe("Persona - validazione codice fiscale", () => {
  test("normalizza il codice fiscale in maiuscolo", () => {
    const persona = creaPersona(" rssmra80a10h501u ");

    expect(persona.codiceFiscale).toBe("RSSMRA80A10H501U");
  });

  test("accetta le lettere previste per l'omocodia nelle posizioni numeriche", () => {
    const persona = creaPersona("RSSMRA8LA1LH5L1U");

    expect(persona.codiceFiscale).toBe("RSSMRA8LA1LH5L1U");
  });

  test.each([
    "RSSMRA80A10H501",
    "RSSMRA80A10H501UU",
    "123MRA80A10H501U",
    "RSSMRA80A10H50AU",
  ])("rifiuta il formato non valido %s", (codiceFiscale) => {
    expect(() => creaPersona(codiceFiscale)).toThrow(
      "Il codice fiscale deve avere 16 caratteri nel formato previsto",
    );
  });
});

describe("Persona - IBAN opzionale", () => {
  test("normalizza l'IBAN quando è presente", () => {
    const persona = new Persona({
      nome: "Mario",
      cognome: "Rossi",
      luogoNascita: "Roma",
      dataNascita: new Date("1980-01-10T00:00:00.000Z"),
      codiceFiscale: "RSSMRA80A10H501U",
      iban: "it 60 x054 2811 1010 0000 0123 456",
      residenza: new Indirizzo({
        provincia: "RM",
        comune: "Roma",
        indirizzo: "Via Esempio",
      }),
    });

    expect(persona.iban).toBe("IT60X0542811101000000123456");
  });
});

describe("Persona - validazione data di nascita", () => {
  const oggi = new Date("2026-09-13T00:00:00.000Z");

  test.each([
    "2008-09-13T00:00:00.000Z",
    "1876-09-13T00:00:00.000Z",
    "1980-01-10T00:00:00.000Z",
  ])("accetta la data %s entro i limiti inclusivi", (data) => {
    expect(() =>
      Persona.validaDataNascita(new Date(data), oggi),
    ).not.toThrow();
  });

  test.each([
    "2008-09-14T00:00:00.000Z",
    "1876-09-12T00:00:00.000Z",
  ])("rifiuta la data %s fuori dai limiti", (data) => {
    expect(() =>
      Persona.validaDataNascita(new Date(data), oggi),
    ).toThrow(
      "La data di nascita deve corrispondere a un'età compresa tra 18 e 150 anni",
    );
  });
});
