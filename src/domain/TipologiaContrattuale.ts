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
