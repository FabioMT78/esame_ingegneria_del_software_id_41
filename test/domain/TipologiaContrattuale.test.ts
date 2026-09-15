import Articolo from "../../src/domain/Articolo";
import TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";

function creaArticolo(): Articolo {
  return new Articolo({
    numArticolo: 1,
    numParte: 0,
    titolo: "Articolo 1",
    descrizione: "Testo",
  });
}

describe("TipologiaContrattuale", () => {
  test("richiede almeno un articolo template", () => {
    expect(
      () =>
        new TipologiaContrattuale({
          denominazione: "Canone concordato",
          durata: 3,
          rinnovo: 2,
          articoli: [],
        }),
    ).toThrow("La tipologia contrattuale deve definire almeno un articolo");
  });

  test("accetta una tipologia con almeno un articolo", () => {
    const articolo = creaArticolo();
    const articoli = [articolo];

    const tipologia = new TipologiaContrattuale({
      denominazione: "Canone concordato",
      durata: 3,
      rinnovo: 2,
      articoli,
    });

    expect(tipologia.articoli).toEqual(articoli);
    expect(tipologia.articoli).not.toBe(articoli);
  });
});
