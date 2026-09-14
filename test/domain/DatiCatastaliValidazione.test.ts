import DatiCatastali from "../../src/domain/DatiCatastali";

type Dati = ConstructorParameters<typeof DatiCatastali>[0];

function datiValidi(): Dati {
  return {
    codiceComunale: "H501",
    foglio: 0,
    particella: 0,
    subalterno: 0,
    categoria: "A/2",
    consistenza: 0,
    rendita: 0,
  };
}

describe("DatiCatastali - valori numerici non negativi", () => {
  test("accetta il valore zero", () => {
    expect(() => new DatiCatastali(datiValidi())).not.toThrow();
  });

  test.each([
    ["foglio", "Foglio"],
    ["particella", "Particella"],
    ["subalterno", "Subalterno"],
    ["consistenza", "Consistenza"],
    ["rendita", "Rendita"],
  ] as const)(
    "rifiuta %s negativo",
    (campo, etichetta) => {
      const dati = datiValidi();
      dati[campo] = -1;

      expect(() => new DatiCatastali(dati)).toThrow(
        `${etichetta} non può essere negativo`,
      );
    },
  );
});
