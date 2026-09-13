import DataCorrenteSistemaProvider from "../../../src/infrastructure/time/DataCorrenteSistemaProvider";

describe("DataCorrenteSistemaProvider", () => {
  test("restituisce la data di calendario del sistema normalizzata a UTC", () => {
    const provider = new DataCorrenteSistemaProvider(
      () => new Date(2026, 8, 13, 23, 45, 30),
    );

    expect(provider.oggi().toISOString()).toBe(
      "2026-09-13T00:00:00.000Z",
    );
  });

  test("restituisce una nuova istanza a ogni invocazione", () => {
    const provider = new DataCorrenteSistemaProvider(
      () => new Date(2026, 8, 13, 10, 0, 0),
    );

    const prima = provider.oggi();
    const seconda = provider.oggi();

    expect(prima).not.toBe(seconda);
    expect(prima.getTime()).toBe(seconda.getTime());
  });
});
