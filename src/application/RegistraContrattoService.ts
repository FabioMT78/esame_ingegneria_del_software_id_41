import type BozzaContratto from "./model/BozzaContratto";
import type BozzaContrattoRepository from "./ports/BozzaContrattoRepository";

class RegistraContrattoService {
  constructor(private readonly bozzaRepository: BozzaContrattoRepository) {}

  async avvia(): Promise<BozzaContratto | null> {
    return this.bozzaRepository.recupera();
  }

  async annulla(): Promise<void> {
    await this.bozzaRepository.elimina();
  }
}

export = RegistraContrattoService;
