import type Immobile from "../../domain/Immobile";
import type Persona from "../../domain/Persona";

type BozzaContrattoParams = {
  stepCompletato: number;
  immobile?: Immobile;
  proprietario?: Persona;
  inquilino?: Persona;
  nomeDescrizione?: string;
  dal?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;
};

class BozzaContratto {
  stepCompletato: number;
  immobile?: Immobile;
  proprietario?: Persona;
  inquilino?: Persona;
  nomeDescrizione?: string;
  dal?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;

  constructor({
    stepCompletato,
    immobile,
    proprietario,
    inquilino,
    nomeDescrizione,
    dal,
    canoneMensile,
    giornoPagamento,
  }: BozzaContrattoParams) {
    this.stepCompletato = stepCompletato;

    if (immobile !== undefined) {
      this.immobile = immobile;
    }

    if (proprietario !== undefined) {
      this.proprietario = proprietario;
    }

    if (inquilino !== undefined) {
      this.inquilino = inquilino;
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
