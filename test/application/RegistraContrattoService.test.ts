import BozzaContratto from "../../src/application/model/BozzaContratto";
import RegistraContrattoService from "../../src/application/RegistraContrattoService";
import type BozzaContrattoRepository from "../../src/application/ports/BozzaContrattoRepository";

class BozzaContrattoRepositoryFake
  implements BozzaContrattoRepository
{
  bozza: BozzaContratto | null = null;
  eliminata = false;

  async recupera(): Promise<BozzaContratto | null> {
    return this.bozza;
  }

  async salva(bozza: BozzaContratto): Promise<void> {
    this.bozza = bozza;
  }

  async elimina(): Promise<void> {
    this.eliminata = true;
    this.bozza = null;
  }
}

describe("RegistraContrattoService.avvia", () => {
  test("restituisce null quando non esiste una bozza", async () => {
    const repository = new BozzaContrattoRepositoryFake();
    const service = new RegistraContrattoService(repository);

    await expect(service.avvia()).resolves.toBeNull();
  });

  test("restituisce la bozza esistente", async () => {
    const repository = new BozzaContrattoRepositoryFake();
    const bozza = new BozzaContratto({
      stepCompletato: 2,
      nomeDescrizione: "Contratto Rossi",
    });

    repository.bozza = bozza;

    const service = new RegistraContrattoService(repository);

    await expect(service.avvia()).resolves.toBe(bozza);
  });
});

describe("RegistraContrattoService.annulla", () => {
  test("elimina la bozza esistente", async () => {
    const repository = new BozzaContrattoRepositoryFake();
    repository.bozza = new BozzaContratto({
      stepCompletato: 2,
    });

    const service = new RegistraContrattoService(repository);

    await service.annulla();

    expect(repository.eliminata).toBe(true);
    expect(repository.bozza).toBeNull();
  });
});
