import RegistraContrattoService from "../../src/application/RegistraContrattoService";
import BozzaContratto from "../../src/application/model/BozzaContratto";
import type BozzaContrattoRepository from "../../src/application/ports/BozzaContrattoRepository";
import type ImmobileRepository from "../../src/application/ports/ImmobileRepository";
import DatiCatastali from "../../src/domain/DatiCatastali";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";

class BozzaContrattoRepositoryFake implements BozzaContrattoRepository {
  bozza: BozzaContratto | null = null;
  eliminata = false;
  salvataggi = 0;

  async recupera(): Promise<BozzaContratto | null> {
    return this.bozza;
  }

  async salva(bozza: BozzaContratto): Promise<void> {
    this.salvataggi += 1;
    this.bozza = bozza;
  }

  async elimina(): Promise<void> {
    this.eliminata = true;
    this.bozza = null;
  }
}

class ImmobileRepositoryFake implements ImmobileRepository {
  immobili: Immobile[] = [];

  async trovaTutti(): Promise<Immobile[]> {
    return this.immobili;
  }

  async trovaPerId(id: number): Promise<Immobile | null> {
    return this.immobili.find((immobile) => immobile.id === id) ?? null;
  }

  async trovaPerDatiCatastali(
    _dati: DatiCatastali,
  ): Promise<Immobile | null> {
    return null;
  }

  async esisteConIndirizzo(_indirizzo: Indirizzo): Promise<boolean> {
    return false;
  }
}

function creaImmobile(id: number, nome: string, particella: number): Immobile {
  return new Immobile({
    id,
    nome,
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Esempio",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 1,
      particella,
      subalterno: 1,
      categoria: "A/2",
      consistenza: 5,
      rendita: 1000,
    }),
  });
}

function creaService(
  bozzaRepository = new BozzaContrattoRepositoryFake(),
  immobileRepository = new ImmobileRepositoryFake(),
): {
  service: RegistraContrattoService;
  bozzaRepository: BozzaContrattoRepositoryFake;
  immobileRepository: ImmobileRepositoryFake;
} {
  return {
    service: new RegistraContrattoService(
      bozzaRepository,
      immobileRepository,
    ),
    bozzaRepository,
    immobileRepository,
  };
}

describe("RegistraContrattoService.avvia", () => {
  test("restituisce null quando non esiste una bozza", async () => {
    const { service } = creaService();

    await expect(service.avvia()).resolves.toBeNull();
  });

  test("restituisce la bozza esistente", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = new BozzaContratto({
      stepCompletato: 2,
      nomeDescrizione: "Contratto Rossi",
    });

    bozzaRepository.bozza = bozza;

    const { service } = creaService(bozzaRepository);

    await expect(service.avvia()).resolves.toBe(bozza);
  });
});

describe("RegistraContrattoService.elencaImmobili", () => {
  test("restituisce gli immobili disponibili anche quando hanno lo stesso nome", async () => {
    const immobileRepository = new ImmobileRepositoryFake();
    const primo = creaImmobile(1, "Casa Roma", 10);
    const secondo = creaImmobile(2, "Casa Roma", 20);

    immobileRepository.immobili = [primo, secondo];

    const { service } = creaService(
      new BozzaContrattoRepositoryFake(),
      immobileRepository,
    );

    await expect(service.elencaImmobili()).resolves.toEqual([
      primo,
      secondo,
    ]);
  });
});

describe("RegistraContrattoService.selezionaImmobile", () => {
  test("seleziona tramite id l'immobile corretto anche quando il nome non è univoco", async () => {
    const immobileRepository = new ImmobileRepositoryFake();
    const primo = creaImmobile(1, "Casa Roma", 10);
    const secondo = creaImmobile(2, "Casa Roma", 20);

    immobileRepository.immobili = [primo, secondo];

    const { service, bozzaRepository } = creaService(
      new BozzaContrattoRepositoryFake(),
      immobileRepository,
    );

    const bozza = await service.selezionaImmobile(2);

    expect(bozza.stepCompletato).toBe(1);
    expect(bozza.immobile).toBe(secondo);
    expect(bozzaRepository.bozza).toBe(bozza);
    expect(bozzaRepository.salvataggi).toBe(1);
  });

  test("rifiuta un id inesistente senza salvare una bozza", async () => {
    const { service, bozzaRepository } = creaService();

    await expect(service.selezionaImmobile(999)).rejects.toThrow(
      "Immobile non trovato",
    );

    expect(bozzaRepository.bozza).toBeNull();
    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("aggiorna una bozza esistente senza perdere i dati già acquisiti né retrocedere lo step", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const immobileRepository = new ImmobileRepositoryFake();
    const immobile = creaImmobile(1, "Casa Roma", 10);
    const dal = new Date("2026-10-01T00:00:00.000Z");

    immobileRepository.immobili = [immobile];
    bozzaRepository.bozza = new BozzaContratto({
      stepCompletato: 4,
      nomeDescrizione: "Contratto esistente",
      dal,
      canoneMensile: 900,
      giornoPagamento: 10,
    });

    const bozzaPrecedente = bozzaRepository.bozza;
    const { service } = creaService(
      bozzaRepository,
      immobileRepository,
    );

    const bozza = await service.selezionaImmobile(1);

    expect(bozza).toBe(bozzaPrecedente);
    expect(bozza.stepCompletato).toBe(4);
    expect(bozza.immobile).toBe(immobile);
    expect(bozza.nomeDescrizione).toBe("Contratto esistente");
    expect(bozza.dal).toEqual(dal);
    expect(bozza.canoneMensile).toBe(900);
    expect(bozza.giornoPagamento).toBe(10);
    expect(bozzaRepository.salvataggi).toBe(1);
  });
});

describe("RegistraContrattoService.annulla", () => {
  test("elimina la bozza esistente", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    bozzaRepository.bozza = new BozzaContratto({
      stepCompletato: 2,
    });

    const { service } = creaService(bozzaRepository);

    await service.annulla();

    expect(bozzaRepository.eliminata).toBe(true);
    expect(bozzaRepository.bozza).toBeNull();
  });
});
