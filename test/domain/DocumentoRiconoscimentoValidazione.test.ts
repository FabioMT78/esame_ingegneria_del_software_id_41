import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";

function creaDocumento(
  dataRilascio: string,
  dataScadenza: string,
): DocumentoRiconoscimento {
  return new DocumentoRiconoscimento({
    tipo: "carta d'identità",
    organoEmittente: "Comune di Roma",
    dataRilascio: new Date(dataRilascio),
    dataScadenza: new Date(dataScadenza),
    numero: "CA1234567",
  });
}

describe("DocumentoRiconoscimento - validità temporale", () => {
  const oggi = new Date("2026-09-14T00:00:00.000Z");

  test("accetta un rilascio avvenuto oggi e una scadenza futura", () => {
    const documento = creaDocumento(
      "2026-09-14T00:00:00.000Z",
      "2027-09-14T00:00:00.000Z",
    );

    expect(() => documento.validaRilascioAlla(oggi)).not.toThrow();
    expect(() => documento.validaScadenzaAlla(oggi)).not.toThrow();
  });

  test("rifiuta una data di rilascio successiva alla data corrente", () => {
    const documento = creaDocumento(
      "2026-09-15T00:00:00.000Z",
      "2027-09-14T00:00:00.000Z",
    );

    expect(() => documento.validaRilascioAlla(oggi)).toThrow(
      "La data di rilascio del documento non può essere successiva alla data corrente",
    );
  });

  test("rifiuta una scadenza uguale alla data corrente", () => {
    const documento = creaDocumento(
      "2024-01-01T00:00:00.000Z",
      "2026-09-14T00:00:00.000Z",
    );

    expect(() => documento.validaScadenzaAlla(oggi)).toThrow(
      "La data di scadenza del documento deve essere successiva alla data corrente",
    );
  });

  test("rifiuta un documento già scaduto", () => {
    const documento = creaDocumento(
      "2024-01-01T00:00:00.000Z",
      "2026-09-13T00:00:00.000Z",
    );

    expect(() => documento.validaScadenzaAlla(oggi)).toThrow(
      "La data di scadenza del documento deve essere successiva alla data corrente",
    );
  });
});
