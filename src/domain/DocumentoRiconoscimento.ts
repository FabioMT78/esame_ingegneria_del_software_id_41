type DocumentoRiconoscimentoParams = {
  id?: number;
  tipo: "carta d'identità" | "passaporto";
  organoEmittente: string;
  dataRilascio: Date;
  dataScadenza: Date;
  numero: string;
};

class DocumentoRiconoscimento {
  readonly id?: number;
  tipo: "carta d'identità" | "passaporto";
  organoEmittente: string;
  dataRilascio: Date;
  dataScadenza: Date;
  numero: string;

  constructor({
    id,
    tipo,
    organoEmittente,
    dataRilascio,
    dataScadenza,
    numero,
  }: DocumentoRiconoscimentoParams) {
    if (id !== undefined) {
      this.id = id;
    }

    this.tipo = tipo;
    this.organoEmittente = organoEmittente;
    this.dataRilascio = new Date(dataRilascio.getTime());
    this.dataScadenza = new Date(dataScadenza.getTime());
    this.numero = numero;
  }

  validaRilascioAlla(oggi: Date): void {
    if (Number.isNaN(oggi.getTime())) {
      throw new RangeError("Data corrente non valida");
    }

    if (
      Number.isNaN(this.dataRilascio.getTime()) ||
      this.dataRilascio > oggi
    ) {
      throw new RangeError(
        "La data di rilascio del documento non può essere successiva alla data corrente",
      );
    }
  }

  validaScadenzaAlla(oggi: Date): void {
    if (Number.isNaN(oggi.getTime())) {
      throw new RangeError("Data corrente non valida");
    }

    if (
      Number.isNaN(this.dataScadenza.getTime()) ||
      this.dataScadenza <= oggi
    ) {
      throw new RangeError(
        "La data di scadenza del documento deve essere successiva alla data corrente",
      );
    }
  }
}

export = DocumentoRiconoscimento;
