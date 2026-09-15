import type Articolo from "./Articolo";

type TipologiaContrattualeParams = {
  id?: number;
  denominazione: string;
  durata: number;
  rinnovo: number;
  articoli: Articolo[];
};

class TipologiaContrattuale {
  id?: number;
  denominazione: string;
  durata: number;
  rinnovo: number;
  articoli: Articolo[];

  constructor({
    id,
    denominazione,
    durata,
    rinnovo,
    articoli,
  }: TipologiaContrattualeParams) {
    if (articoli.length === 0) {
      throw new RangeError(
        "La tipologia contrattuale deve definire almeno un articolo",
      );
    }

    if (id !== undefined) {
      this.id = id;
    }

    this.denominazione = denominazione;
    this.durata = durata;
    this.rinnovo = rinnovo;
    this.articoli = [...articoli];
  }
}

export = TipologiaContrattuale;
