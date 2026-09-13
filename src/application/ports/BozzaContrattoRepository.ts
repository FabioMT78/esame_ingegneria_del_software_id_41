import type BozzaContratto from "../model/BozzaContratto";

interface BozzaContrattoRepository {
  elenca(): Promise<BozzaContratto[]>;
  trovaPerId(idBozza: number): Promise<BozzaContratto | null>;
  trovaPerImmobileId(immobileId: number): Promise<BozzaContratto | null>;
  salva(bozza: BozzaContratto): Promise<BozzaContratto>;
  elimina(idBozza: number): Promise<void>;
}

export = BozzaContrattoRepository;
