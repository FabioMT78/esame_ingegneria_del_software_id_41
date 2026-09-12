type IndirizzoParams = {
  id?: number;
  nazione?: string;
  provincia: string;
  comune: string;
  cap?: string;
  indirizzo: string;
  civico?: string;
  scala?: string;
  interno?: string;
};

class Indirizzo {
  id?: number;
  nazione?: string;
  provincia: string;
  comune: string;
  cap?: string;
  indirizzo: string;
  civico?: string;
  scala?: string;
  interno?: string;

  constructor({
    id,
    nazione,
    provincia,
    comune,
    cap,
    indirizzo,
    civico,
    scala,
    interno,
  }: IndirizzoParams) {
    if (id !== undefined) {
      this.id = id;
    }

    if (nazione !== undefined) {
      this.nazione = nazione;
    }

    this.provincia = provincia;
    this.comune = comune;

    if (cap !== undefined) {
      this.cap = cap;
    }

    this.indirizzo = indirizzo;

    if (civico !== undefined) {
      this.civico = civico;
    }

    if (scala !== undefined) {
      this.scala = scala;
    }

    if (interno !== undefined) {
      this.interno = interno;
    }
  }
}

export = Indirizzo;
