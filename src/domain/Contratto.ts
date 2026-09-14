import type Immobile from "./Immobile";
import type Pagamento from "./Pagamento";
import type Persona from "./Persona";
import type TipologiaContrattuale from "./TipologiaContrattuale";

type ContrattoParams = {
  id?: number;
  nomeDescrizione: string;
  immobile: Immobile;
  proprietario: Persona;
  inquilino: Persona;
  tipologia: TipologiaContrattuale;
  dal: Date;
  al: Date;
  canoneMensile: number;
  giornoPagamento: number;
  registratoIl: Date;
};

class Contratto {
  id?: number;
  nomeDescrizione: string;
  immobile: Immobile;
  proprietario: Persona;
  inquilino: Persona;
  tipologia: TipologiaContrattuale;
  dal: Date;
  al: Date;
  canoneMensile: number;
  giornoPagamento: number;
  registratoIl: Date;
  contenuto?: string;
  pagamenti: Pagamento[] = [];

  constructor({
    id,
    nomeDescrizione,
    immobile,
    proprietario,
    inquilino,
    tipologia,
    dal,
    al,
    canoneMensile,
    giornoPagamento,
    registratoIl,
  }: ContrattoParams) {
    Contratto.validaGiornoPagamento(giornoPagamento);

    if (proprietario.codiceFiscale === inquilino.codiceFiscale) {
      throw new RangeError(
        "Proprietario e inquilino devono essere persone distinte",
      );
    }

    if (al < dal) {
      throw new RangeError(
        "La data finale del contratto non può precedere la data iniziale",
      );
    }

    if (id !== undefined) {
      this.id = id;
    }

    this.nomeDescrizione = nomeDescrizione;
    this.immobile = immobile;
    this.proprietario = proprietario;
    this.inquilino = inquilino;
    this.tipologia = tipologia;
    this.dal = new Date(dal.getTime());
    this.al = new Date(al.getTime());
    this.canoneMensile = canoneMensile;
    this.giornoPagamento = giornoPagamento;
    this.registratoIl = new Date(registratoIl.getTime());
  }

  get canoneAnnuale(): number {
    return Math.round(this.canoneMensile * 12 * 100) / 100;
  }

  static validaGiornoPagamento(giornoPagamento: number): void {
    if (
      !Number.isInteger(giornoPagamento) ||
      giornoPagamento < 1 ||
      giornoPagamento > 28
    ) {
      throw new RangeError(
        "Il giorno di pagamento deve essere compreso tra 1 e 28",
      );
    }
  }

  static calcolaDataFine(
    dal: Date,
    tipologia: Pick<TipologiaContrattuale, "durata">,
  ): Date {
    const anniversario = new Date(dal.getTime());

    anniversario.setUTCFullYear(
      anniversario.getUTCFullYear() + tipologia.durata,
    );

    anniversario.setUTCDate(anniversario.getUTCDate() - 1);

    return anniversario;
  }

  static periodiSiSovrappongono(
    dal: Date,
    al: Date,
    altroDal: Date,
    altroAl: Date,
  ): boolean {
    return dal <= altroAl && altroDal <= al;
  }

  siSovrapponeA(altro: Contratto): boolean {
    return Contratto.periodiSiSovrappongono(
      this.dal,
      this.al,
      altro.dal,
      altro.al,
    );
  }

  impostaContenuto(contenuto: string): void {
    this.contenuto = contenuto;
  }

  aggiungiPagamento(pagamento: Pagamento): void {
    const duplicato = this.pagamenti.some(
      (esistente) =>
        esistente.annoCompetenza === pagamento.annoCompetenza &&
        esistente.meseCompetenza === pagamento.meseCompetenza,
    );

    if (duplicato) {
      throw new Error(
        "Esiste già un pagamento per la competenza indicata",
      );
    }

    this.pagamenti.push(pagamento);
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

  #calcolaImporto(
    anno: number,
    mese: number,
    canoneMensile: number,
    inizioRapporto = true,
  ): number {
    const giorniDelMese = new Date(Date.UTC(anno, mese, 0));
    const canoneGiornaliero = canoneMensile / giorniDelMese.getUTCDate();

    const numeroGiorniDaPagare = inizioRapporto
      ? giorniDelMese.getUTCDate() - this.dal.getUTCDate() + 1
      : this.al.getUTCDate();

    return Math.round(canoneGiornaliero * numeroGiorniDaPagare * 100) / 100;
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
      return this.#calcolaImporto(anno, mese, this.canoneMensile, true);
    }

    if (
      dataDiCompetenza.getUTCMonth() === this.al.getUTCMonth() &&
      dataDiCompetenza.getUTCFullYear() === this.al.getUTCFullYear()
    ) {
      return this.#calcolaImporto(anno, mese, this.canoneMensile, false);
    }

    return this.canoneMensile;
  }
}

export = Contratto;
