import type DatiCatastali from "./DatiCatastali";
import type Indirizzo from "./Indirizzo";

type ImmobileParams = {
  id?: number;
  nome: string;
  indirizzo: Indirizzo;
  datiCatastali: DatiCatastali;
};

class Immobile {
  id?: number;
  nome: string;
  indirizzo: Indirizzo;
  datiCatastali: DatiCatastali;

  constructor({ id, nome, indirizzo, datiCatastali }: ImmobileParams) {
    if (id !== undefined) {
      this.id = id;
    }

    this.nome = nome;
    this.indirizzo = indirizzo;
    this.datiCatastali = datiCatastali;
  }
}

export = Immobile;
