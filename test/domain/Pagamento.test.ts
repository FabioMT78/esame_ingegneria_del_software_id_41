import Pagamento from "../../src/domain/Pagamento";

describe("Pagamento", () => {
  test.each([1, 12])("accetta il mese di competenza limite %i", (mese) => {
    expect(
      () =>
        new Pagamento({
          annoCompetenza: 2026,
          meseCompetenza: mese,
          dataPagamento: new Date("2026-01-01T00:00:00.000Z"),
          importo: 1000,
        }),
    ).not.toThrow();
  });

  test.each([0, 13])("rifiuta il mese di competenza non valido %i", (mese) => {
    expect(
      () =>
        new Pagamento({
          annoCompetenza: 2026,
          meseCompetenza: mese,
          dataPagamento: new Date("2026-01-01T00:00:00.000Z"),
          importo: 1000,
        }),
    ).toThrow(RangeError);
  });

  test("conserva una copia della data di pagamento", () => {
    const dataPagamento = new Date("2026-06-15T00:00:00.000Z");
    const pagamento = new Pagamento({
      annoCompetenza: 2026,
      meseCompetenza: 6,
      dataPagamento,
      importo: 533.33,
    });

    expect(pagamento.dataPagamento).toEqual(dataPagamento);
    expect(pagamento.dataPagamento).not.toBe(dataPagamento);
  });
});
