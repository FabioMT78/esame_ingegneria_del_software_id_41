import { leggiDatiContrattuali } from "../../src/web/Uc01HttpInput";

describe("Uc01HttpInput.leggiDatiContrattuali", () => {
  const datiValidi = {
    nomeDescrizione: "Contratto Rossi",
    tipologiaId: 1,
    dal: "2026-10-01",
    giornoPagamento: 15,
  };

  test.each([0, -0.01, -100])(
    "rifiuta il canone mensile non positivo %p",
    (canoneMensile) => {
      expect(() =>
        leggiDatiContrattuali({ ...datiValidi, canoneMensile }),
      ).toThrow("Il canone mensile deve essere maggiore di zero");
    },
  );

  test("accetta un canone mensile positivo", () => {
    const input = leggiDatiContrattuali({
      ...datiValidi,
      canoneMensile: 900,
    });

    expect(input.canoneMensile).toBe(900);
  });
});
