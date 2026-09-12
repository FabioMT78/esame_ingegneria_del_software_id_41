import type Immobile from "../domain/Immobile";
import BozzaContratto from "./model/BozzaContratto";
import type BozzaContrattoRepository from "./ports/BozzaContrattoRepository";
import type ImmobileRepository from "./ports/ImmobileRepository";

class RegistraContrattoService {
  constructor(
    private readonly bozzaRepository: BozzaContrattoRepository,
    private readonly immobileRepository: ImmobileRepository,
  ) {}

  async avvia(): Promise<BozzaContratto | null> {
    return this.bozzaRepository.recupera();
  }

  async elencaImmobili(): Promise<Immobile[]> {
    return this.immobileRepository.trovaTutti();
  }

  async selezionaImmobile(immobileId: number): Promise<BozzaContratto> {
    const immobile = await this.immobileRepository.trovaPerId(immobileId);

    if (immobile === null) {
      throw new Error("Immobile non trovato");
    }

    let bozza = await this.bozzaRepository.recupera();

    if (bozza === null) {
      bozza = new BozzaContratto({
        stepCompletato: 1,
        immobile,
      });
    } else {
      bozza.immobile = immobile;
      bozza.stepCompletato = Math.max(bozza.stepCompletato, 1);
    }

    await this.bozzaRepository.salva(bozza);

    return bozza;
  }

  async annulla(): Promise<void> {
    await this.bozzaRepository.elimina();
  }
}

export = RegistraContrattoService;
