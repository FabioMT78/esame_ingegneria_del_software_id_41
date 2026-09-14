import {
  leggiPersonaDaBody,
} from "../../src/web/Uc01HttpInput";
import { serializzaPersona } from "../../src/web/Uc01HttpOutput";

describe("contratto HTTP UC-01 - IBAN Persona", () => {
  test("legge, normalizza e serializza l'IBAN del proprietario", () => {
    const persona = leggiPersonaDaBody({
      persona: {
        nome: "Mario",
        cognome: "Rossi",
        luogoNascita: "Roma",
        dataNascita: "1980-01-10",
        codiceFiscale: "RSSMRA80A10H501U",
        iban: "it 60 x054 2811 1010 0000 0123 456",
        residenza: {
          provincia: "RM",
          comune: "Roma",
          indirizzo: "Via Esempio",
        },
      },
    });

    expect(persona.iban).toBe("IT60X0542811101000000123456");
    expect(serializzaPersona(persona).iban).toBe(
      "IT60X0542811101000000123456",
    );
  });

  test("mantiene l'IBAN opzionale quando non è disponibile", () => {
    const persona = leggiPersonaDaBody({
      persona: {
        nome: "Mario",
        cognome: "Rossi",
        luogoNascita: "Roma",
        dataNascita: "1980-01-10",
        codiceFiscale: "RSSMRA80A10H501U",
        residenza: {
          provincia: "RM",
          comune: "Roma",
          indirizzo: "Via Esempio",
        },
      },
    });

    expect(persona.iban).toBeUndefined();
    expect(serializzaPersona(persona).iban).toBeNull();
  });
});
