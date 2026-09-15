import Contratto from "../../src/domain/Contratto";

describe("Contratto.validaCanoneMensile", () => {
  test.each([0, -0.01, -100])(
    "rifiuta un canone non positivo: %p",
    (canoneMensile) => {
      expect(() => Contratto.validaCanoneMensile(canoneMensile)).toThrow(
        "Il canone mensile deve essere maggiore di zero",
      );
    },
  );

  test.each([0.01, 1, 1000])(
    "accetta un canone positivo: %p",
    (canoneMensile) => {
      expect(() =>
        Contratto.validaCanoneMensile(canoneMensile),
      ).not.toThrow();
    },
  );
});
