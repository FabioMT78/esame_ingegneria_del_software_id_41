import BozzaContratto from "../../../src/application/model/BozzaContratto";
import Indirizzo from "../../../src/domain/Indirizzo";
import Persona from "../../../src/domain/Persona";
import BozzaContrattoJsonMapper from "../../../src/infrastructure/persistence/postgres/BozzaContrattoJsonMapper";

describe("BozzaContrattoJsonMapper - IBAN", () => {
  test("mantiene l'IBAN del proprietario nel round-trip JSONB", () => {
    const bozza = new BozzaContratto({
      idBozza: 3,
      stepCompletato: 2,
      proprietario: new Persona({
        nome: "Mario",
        cognome: "Rossi",
        luogoNascita: "Roma",
        dataNascita: new Date("1980-01-10T00:00:00.000Z"),
        codiceFiscale: "RSSMRA80A10H501U",
        iban: "IT60X0542811101000000123456",
        residenza: new Indirizzo({
          provincia: "RM",
          comune: "Roma",
          indirizzo: "Via Esempio",
        }),
      }),
    });

    const json = BozzaContrattoJsonMapper.serializza(bozza);
    const riletta = BozzaContrattoJsonMapper.deserializza(3, json);

    expect(riletta.proprietario?.iban).toBe(
      "IT60X0542811101000000123456",
    );
  });
});
