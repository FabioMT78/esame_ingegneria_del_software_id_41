import type Immobile from "../../domain/Immobile";

type BozzaContrattoParams = {
  stepCompletato: number;
  immobile?: Immobile;
  nomeDescrizione?: string;
  dal?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;
};

class BozzaContratto {
  stepCompletato: number;
  immobile?: Immobile;
  nomeDescrizione?: string;
  dal?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;

  constructor({
    stepCompletato,
    immobile,
    nomeDescrizione,
    dal,
    canoneMensile,
    giornoPagamento,
  }: BozzaContrattoParams) {
    this.stepCompletato = stepCompletato;

    if (immobile !== undefined) {
      this.immobile = immobile;
    }

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
