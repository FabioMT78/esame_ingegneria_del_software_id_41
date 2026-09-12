type BozzaContrattoParams = {
  stepCompletato: number;
  nomeDescrizione?: string;
  dal?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;
};

class BozzaContratto {
  stepCompletato: number;
  nomeDescrizione?: string;
  dal?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;

  constructor({
    stepCompletato,
    nomeDescrizione,
    dal,
    canoneMensile,
    giornoPagamento,
  }: BozzaContrattoParams) {
    this.stepCompletato = stepCompletato;

    if (nomeDescrizione !== undefined) {
      this.nomeDescrizione = nomeDescrizione;
    }

    if (dal !== undefined) {
      this.dal = new Date(dal.getTime());
    }

    if (canoneMensile !== undefined) {
      this.canoneMensile = canoneMensile;
    }

    if (giornoPagamento !== undefined) {
      this.giornoPagamento = giornoPagamento;
    }
  }
}

export = BozzaContratto;
