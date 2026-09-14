import type Immobile from "../../domain/Immobile";
import type Persona from "../../domain/Persona";
import type TipologiaContrattuale from "../../domain/TipologiaContrattuale";

type BozzaContrattoParams = {
  idBozza?: number;
  stepCompletato: number;
  immobile?: Immobile;
  proprietario?: Persona;
  inquilino?: Persona;
  tipologia?: TipologiaContrattuale;
  nomeDescrizione?: string;
  dal?: Date;
  al?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;
};

class BozzaContratto {
  idBozza?: number;
  stepCompletato: number;
  immobile?: Immobile;
  proprietario?: Persona;
  inquilino?: Persona;
  tipologia?: TipologiaContrattuale;
  nomeDescrizione?: string;
  dal?: Date;
  al?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;

  constructor({
    idBozza,
    stepCompletato,
    immobile,
    proprietario,
    inquilino,
    tipologia,
    nomeDescrizione,
    dal,
    al,
    canoneMensile,
    giornoPagamento,
  }: BozzaContrattoParams) {
    if (idBozza !== undefined) {
      this.idBozza = idBozza;
    }

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

    if (tipologia !== undefined) {
      this.tipologia = tipologia;
    }

    if (nomeDescrizione !== undefined) {
      this.nomeDescrizione = nomeDescrizione;
    }

    if (dal !== undefined) {
      this.dal = new Date(dal.getTime());
    }

    if (al !== undefined) {
      this.al = new Date(al.getTime());
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
