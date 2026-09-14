import Articolo from "../../src/domain/Articolo";
import Contratto from "../../src/domain/Contratto";
import DatiCatastali from "../../src/domain/DatiCatastali";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Persona from "../../src/domain/Persona";
import TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";

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

function creaContratto(canoneMensile: number): Contratto {
  const tipologia = new TipologiaContrattuale({
    id: 1,
    denominazione: "Canone libero",
    durata: 4,
    rinnovo: 4,
    articoli: [
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Canone",
        descrizione: "Testo",
      }),
    ],
  });

  return new Contratto({
    nomeDescrizione: "Contratto",
    immobile: new Immobile({
      nome: "Casa",
      indirizzo: new Indirizzo({
        provincia: "RM",
        comune: "Roma",
        indirizzo: "Via Casa",
      }),
      datiCatastali: new DatiCatastali({
        codiceComunale: "H501",
        foglio: 1,
        particella: 2,
        subalterno: 3,
        categoria: "A/2",
        consistenza: 5,
        rendita: 1000,
      }),
    }),
    proprietario: creaPersona("RSSMRA80A10H501U"),
    inquilino: creaPersona("VRDLGI90B20H501X"),
    tipologia,
    dal: new Date("2026-01-01T00:00:00.000Z"),
    al: new Date("2029-12-31T00:00:00.000Z"),
    canoneMensile,
    giornoPagamento: 5,
    registratoIl: new Date("2025-12-20T00:00:00.000Z"),
  });
}

describe("Contratto.canoneAnnuale", () => {
  test("deriva il canone annuale dal canone mensile senza duplicarlo nello stato", () => {
    expect(creaContratto(950.75).canoneAnnuale).toBe(11409);
  });
});
