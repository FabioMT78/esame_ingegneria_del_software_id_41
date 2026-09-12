type TipologiaContrattuale = {
  durata: number;
  rinnovo: number;
};

type ContrattoParams = {
  dal: Date;
  tipologia: TipologiaContrattuale;
  canoneMensile: number;
  giornoPagamento: number;
};

class Contratto {
  dal: Date;
  tipologia: TipologiaContrattuale;
  canoneMensile: number;
  giornoPagamento: number;

  constructor({
    dal,
    tipologia,
    canoneMensile,
    giornoPagamento,
  }: ContrattoParams) {
    if (
      !Number.isInteger(giornoPagamento) ||
      giornoPagamento < 1 ||
      giornoPagamento > 28
    ) {
      throw new RangeError(
        "Il giorno di pagamento deve essere compreso tra 1 e 28",
      );
    }

    this.dal = new Date(dal.getTime());
    this.tipologia = tipologia;
    this.canoneMensile = canoneMensile;
    this.giornoPagamento = giornoPagamento;
  }

  get al(): Date {
    const anniversario = new Date(this.dal.getTime());

    anniversario.setUTCFullYear(
      anniversario.getUTCFullYear() + this.tipologia.durata,
    );

    anniversario.setUTCDate(anniversario.getUTCDate() - 1);

    return anniversario;
  }

  siSovrapponeA(altro: Contratto): boolean {
    return this.dal <= altro.al && altro.dal <= this.al;
  }

  #checkPeriodoDiCompetenza(dataDiCompetenza: Date): void {
    if (
      dataDiCompetenza.getUTCFullYear() < this.dal.getUTCFullYear() ||
      dataDiCompetenza.getUTCFullYear() > this.al.getUTCFullYear()
    ) {
      throw new RangeError(
        "L'anno passato non è compreso nel periodo del contratto",
      );
    }

    if (
      dataDiCompetenza.getUTCFullYear() === this.dal.getUTCFullYear() &&
      dataDiCompetenza.getUTCMonth() < this.dal.getUTCMonth()
    ) {
      throw new RangeError(
        "Il mese passato non è compreso nel periodo del contratto",
      );
    }

    if (
      dataDiCompetenza.getUTCFullYear() === this.al.getUTCFullYear() &&
      dataDiCompetenza.getUTCMonth() > this.al.getUTCMonth()
    ) {
      throw new RangeError(
        "Il mese passato non è compreso nel periodo del contratto",
      );
    }
  }

  /**
   * Calcola l'importo che deve corrispondere l'inquilino.
   */
  #calcolaImporto(
    anno: number,
    mese: number,
    canoneMensile: number,
    inizioRapporto = true,
  ): number {
    const giorniDelMese = new Date(Date.UTC(anno, mese, 0));
    const canoneGiornaliero =
      canoneMensile / giorniDelMese.getUTCDate();

    const numeroGiorniDaPagare = inizioRapporto
      ? giorniDelMese.getUTCDate() - this.dal.getUTCDate() + 1
      : this.al.getUTCDate();

    return (
      Math.round(canoneGiornaliero * numeroGiorniDaPagare * 100) / 100
    );
  }

  calcolaImportoCompetenza(anno: number, mese: number): number {
    if (!Number.isInteger(mese) || mese < 1 || mese > 12) {
      throw new RangeError(
        "Il mese di competenza deve essere compreso tra 1 e 12",
      );
    }

    const dataDiCompetenza = new Date(Date.UTC(anno, mese - 1, 1));

    this.#checkPeriodoDiCompetenza(dataDiCompetenza);

    if (
      dataDiCompetenza.getUTCMonth() === this.dal.getUTCMonth() &&
      dataDiCompetenza.getUTCFullYear() === this.dal.getUTCFullYear()
    ) {
      return this.#calcolaImporto(
        anno,
        mese,
        this.canoneMensile,
        true,
      );
    }

    if (
      dataDiCompetenza.getUTCMonth() === this.al.getUTCMonth() &&
      dataDiCompetenza.getUTCFullYear() === this.al.getUTCFullYear()
    ) {
      return this.#calcolaImporto(
        anno,
        mese,
        this.canoneMensile,
        false,
      );
    }

    return this.canoneMensile;
  }
}

export = Contratto;
