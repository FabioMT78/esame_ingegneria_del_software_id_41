import type DatiCatastali from "../../domain/DatiCatastali";
import type Immobile from "../../domain/Immobile";
import type Indirizzo from "../../domain/Indirizzo";

interface ImmobileRepository {
  trovaTutti(): Promise<Immobile[]>;
  trovaPerId(id: number): Promise<Immobile | null>;
  trovaPerDatiCatastali(dati: DatiCatastali): Promise<Immobile | null>;
  esisteConIndirizzo(indirizzo: Indirizzo): Promise<boolean>;
}

export = ImmobileRepository;
