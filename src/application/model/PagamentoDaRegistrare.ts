type PagamentoDaRegistrareParams = {
  contrattoId: number;
  canoneMensile: number;
  tipologiaDenominazione: string;
  dal: Date;
  al: Date;
  annoCompetenza: number;
  meseCompetenza: number;
  scadenza: Date;
  importo: number;
  dovuta: boolean;
  tardivo: boolean;
};

class PagamentoDaRegistrare {
  contrattoId: number;
  canoneMensile: number;
  tipologiaDenominazione: string;
  dal: Date;
  al: Date;
  annoCompetenza: number;
  meseCompetenza: number;
  scadenza: Date;
  importo: number;
  dovuta: boolean;
  tardivo: boolean;

  constructor({
    contrattoId,
    canoneMensile,
    tipologiaDenominazione,
    dal,
    al,
    annoCompetenza,
    meseCompetenza,
    scadenza,
    importo,
    dovuta,
    tardivo,
  }: PagamentoDaRegistrareParams) {
    this.contrattoId = contrattoId;
    this.canoneMensile = canoneMensile;
    this.tipologiaDenominazione = tipologiaDenominazione;
    this.dal = new Date(dal.getTime());
    this.al = new Date(al.getTime());
    this.annoCompetenza = annoCompetenza;
    this.meseCompetenza = meseCompetenza;
    this.scadenza = new Date(scadenza.getTime());
    this.importo = importo;
    this.dovuta = dovuta;
    this.tardivo = tardivo;
  }
}

export = PagamentoDaRegistrare;
