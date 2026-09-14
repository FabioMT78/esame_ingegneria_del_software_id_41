import {
  importoInLettere,
  interoInLettere,
} from "../../../src/infrastructure/document/ImportoInLettere";

describe("ImportoInLettere", () => {
  test.each<[number, string]>([
    [0, "zero"],
    [1, "uno"],
    [18, "diciotto"],
    [21, "ventuno"],
    [28, "ventotto"],
    [108, "centotto"],
    [181, "centottantuno"],
    [1000, "mille"],
    [2500, "duemilacinquecento"],
    [1_000_000, "un milione"],
    [2_001_008, "due milioni milleotto"],
  ])("converte %d in %s", (numero, atteso) => {
    expect(interoInLettere(numero)).toBe(atteso);
  });

  test.each<[number, string]>([
    [950, "novecentocinquanta/00"],
    [950.75, "novecentocinquanta/75"],
    [0.5, "zero/50"],
  ])("converte l'importo %d preservando i centesimi", (importo, atteso) => {
    expect(importoInLettere(importo)).toBe(atteso);
  });

  test("rifiuta importi negativi", () => {
    expect(() => importoInLettere(-1)).toThrow("Importo non valido");
  });
});
