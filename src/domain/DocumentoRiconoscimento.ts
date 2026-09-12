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
}

export = DocumentoRiconoscimento;
