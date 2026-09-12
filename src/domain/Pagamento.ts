type PagamentoParams = {
  id?: number;
  annoCompetenza: number;
  meseCompetenza: number;
  dataPagamento: Date;
  importo: number;
};

class Pagamento {
  id?: number;
  annoCompetenza: number;
  meseCompetenza: number;
  dataPagamento: Date;
  importo: number;

  constructor({
    id,
    annoCompetenza,
    meseCompetenza,
    dataPagamento,
    importo,
  }: PagamentoParams) {
    if (
      !Number.isInteger(meseCompetenza) ||
      meseCompetenza < 1 ||
      meseCompetenza > 12
    ) {
      throw new RangeError(
        "Il mese di competenza deve essere compreso tra 1 e 12",
      );
    }

    if (id !== undefined) {
      this.id = id;
    }

    this.annoCompetenza = annoCompetenza;
    this.meseCompetenza = meseCompetenza;
    this.dataPagamento = new Date(dataPagamento.getTime());
    this.importo = importo;
  }
}

export = Pagamento;
