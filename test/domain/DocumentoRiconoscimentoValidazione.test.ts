import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";

function creaDocumento(dataScadenza: string): DocumentoRiconoscimento {
  return new DocumentoRiconoscimento({
    tipo: "carta d'identità",
    organoEmittente: "Comune di Roma",
    dataRilascio: new Date("2024-01-01T00:00:00.000Z"),
    dataScadenza: new Date(dataScadenza),
    numero: "CA1234567",
  });
}

describe("DocumentoRiconoscimento.validaScadenzaAlla", () => {
  const oggi = new Date("2026-09-13T00:00:00.000Z");

  test("accetta un documento con scadenza successiva alla data corrente", () => {
    const documento = creaDocumento("2026-09-14T00:00:00.000Z");

    expect(() => documento.validaScadenzaAlla(oggi)).not.toThrow();
  });

  test("rifiuta un documento che scade nella data corrente", () => {
    const documento = creaDocumento("2026-09-13T00:00:00.000Z");

    expect(() => documento.validaScadenzaAlla(oggi)).toThrow(
      "La data di scadenza del documento deve essere successiva alla data corrente",
    );
  });

  test("rifiuta un documento già scaduto", () => {
    const documento = creaDocumento("2026-09-12T00:00:00.000Z");

    expect(() => documento.validaScadenzaAlla(oggi)).toThrow(
      "La data di scadenza del documento deve essere successiva alla data corrente",
    );
  });
});
