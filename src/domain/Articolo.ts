type ArticoloParams = {
  id?: number;
  numArticolo: number;
  numParte: number;
  titolo: string;
  sottotitolo?: string;
  descrizione: string;
};

class Articolo {
  id?: number;
  numArticolo: number;
  numParte: number;
  titolo: string;
  sottotitolo?: string;
  descrizione: string;

  constructor({
    id,
    numArticolo,
    numParte,
    titolo,
    sottotitolo,
    descrizione,
  }: ArticoloParams) {
    if (id !== undefined) {
      this.id = id;
    }

    this.numArticolo = numArticolo;
    this.numParte = numParte;
    this.titolo = titolo;

    if (sottotitolo !== undefined) {
      this.sottotitolo = sottotitolo;
    }

    this.descrizione = descrizione;
  }
}

export = Articolo;
