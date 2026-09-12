import type BozzaContratto from "../model/BozzaContratto";

interface BozzaContrattoRepository {
    recupera(): Promise<BozzaContratto | null>;
    salva(bozza: BozzaContratto): Promise<void>;
    elimina(): Promise<void>;
}

export = BozzaContrattoRepository;
