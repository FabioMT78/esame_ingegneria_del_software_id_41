import RegistraContrattoService from "../../src/application/RegistraContrattoService";
import BozzaContratto from "../../src/application/model/BozzaContratto";
import type BozzaContrattoRepository from "../../src/application/ports/BozzaContrattoRepository";
import type ContrattoRepository from "../../src/application/ports/ContrattoRepository";
import type DataCorrenteProvider from "../../src/application/ports/DataCorrenteProvider";
import type GeneratoreDocumentoContratto from "../../src/application/ports/GeneratoreDocumentoContratto";
import type ImmobileRepository from "../../src/application/ports/ImmobileRepository";
import type PersonaRepository from "../../src/application/ports/PersonaRepository";
import type RegistrazioneContrattoPort from "../../src/application/ports/RegistrazioneContrattoPort";
import type TipologiaContrattualeRepository from "../../src/application/ports/TipologiaContrattualeRepository";
import Articolo from "../../src/domain/Articolo";
import Contratto from "../../src/domain/Contratto";
import DatiCatastali from "../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Persona from "../../src/domain/Persona";
import TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";

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
  duplicatoCatastale: Immobile | null = null;
  indirizzoDuplicato = false;
  verificheIndirizzo = 0;

  async trovaTutti(): Promise<Immobile[]> {
    return this.immobili;
  }

  async trovaPerId(id: number): Promise<Immobile | null> {
    return this.immobili.find((immobile) => immobile.id === id) ?? null;
  }

  async trovaPerDatiCatastali(
    _dati: DatiCatastali,
  ): Promise<Immobile | null> {
    return this.duplicatoCatastale;
  }

  async esisteConIndirizzo(_indirizzo: Indirizzo): Promise<boolean> {
    this.verificheIndirizzo += 1;
    return this.indirizzoDuplicato;
  }
}

class PersonaRepositoryFake implements PersonaRepository {
  persone: Persona[] = [];

  async trovaPerCodiceFiscale(
    codiceFiscale: string,
  ): Promise<Persona | null> {
    return (
      this.persone.find(
        (persona) => persona.codiceFiscale === codiceFiscale,
      ) ?? null
    );
  }
}

class TipologiaContrattualeRepositoryFake
  implements TipologiaContrattualeRepository
{
  tipologie: TipologiaContrattuale[] = [];
  ricercheConArticoli = 0;

  async trovaTutte(): Promise<TipologiaContrattuale[]> {
    return this.tipologie;
  }

  async trovaPerIdConArticoli(
    id: number,
  ): Promise<TipologiaContrattuale | null> {
    this.ricercheConArticoli += 1;
    return this.tipologie.find((tipologia) => tipologia.id === id) ?? null;
  }
}

class ContrattoRepositoryFake implements ContrattoRepository {
  async trovaPerId(_id: number): Promise<Contratto | null> {
    return null;
  }

  async trovaPerImmobile(_immobileId: number): Promise<Contratto[]> {
    return [];
  }
}

class RegistrazioneContrattoPortFake
  implements RegistrazioneContrattoPort
{
  async registraDefinitivamente(_contratto: Contratto): Promise<void> {}
}

class GeneratoreDocumentoContrattoFake
  implements GeneratoreDocumentoContratto
{
  genera(_contratto: Contratto): string {
    return "<article>Contratto</article>";
  }
}

class DataCorrenteProviderFake implements DataCorrenteProvider {
  oggi(): Date {
    return new Date("2026-01-01T00:00:00.000Z");
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

function creaNuovoImmobileSenzaInterno(): Immobile {
  return new Immobile({
    nome: "Nuova casa",
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Nuova",
      civico: "10",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 2,
      particella: 30,
      subalterno: 4,
      categoria: "A/2",
      consistenza: 4,
      rendita: 850,
    }),
  });
}

function creaNuovoImmobileConInterno(): Immobile {
  return new Immobile({
    nome: "Nuova casa",
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Nuova",
      civico: "10",
      interno: "3",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 2,
      particella: 31,
      subalterno: 4,
      categoria: "A/2",
      consistenza: 4,
      rendita: 850,
    }),
  });
}

function creaPersona(
  codiceFiscale: string,
  conDocumento = false,
  id?: number,
): Persona {
  const persona = new Persona({
    ...(id !== undefined ? { id } : {}),
    nome: "Mario",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-10T00:00:00.000Z"),
    codiceFiscale,
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Residenza",
    }),
  });

  if (conDocumento) {
    persona.impostaDocumentoRiconoscimento(
      new DocumentoRiconoscimento({
        tipo: "carta d'identità",
        organoEmittente: "Comune di Roma",
        dataRilascio: new Date("2024-01-01T00:00:00.000Z"),
        dataScadenza: new Date("2034-01-01T00:00:00.000Z"),
        numero: "CA1234567",
      }),
    );
  }

  return persona;
}

function creaBozzaConImmobile(stepCompletato = 1): BozzaContratto {
  return new BozzaContratto({
    stepCompletato,
    immobile: creaImmobile(1, "Casa Roma", 10),
  });
}

function creaArticolo(
  id: number,
  numArticolo: number,
  numParte: number,
): Articolo {
  return new Articolo({
    id,
    numArticolo,
    numParte,
    titolo: `Articolo ${numArticolo}`,
    descrizione: `Parte ${numParte}`,
  });
}

function creaTipologia(
  id: number,
  denominazione = "Canone concordato",
  durata = 3,
  rinnovo = 2,
): TipologiaContrattuale {
  return new TipologiaContrattuale({
    id,
    denominazione,
    durata,
    rinnovo,
    articoli: [
      creaArticolo(id * 10 + 1, 1, 0),
      creaArticolo(id * 10 + 2, 1, 1),
    ],
  });
}

function creaBozzaCompletaFinoInquilino(
  stepCompletato = 3,
): BozzaContratto {
  const bozza = creaBozzaConImmobile(stepCompletato);
  bozza.proprietario = creaPersona("RSSMRA80A10H501U");
  bozza.inquilino = creaPersona("VRDLGI90B20H501X", true);
  return bozza;
}

function creaService(
  bozzaRepository = new BozzaContrattoRepositoryFake(),
  immobileRepository = new ImmobileRepositoryFake(),
  personaRepository = new PersonaRepositoryFake(),
  tipologiaRepository = new TipologiaContrattualeRepositoryFake(),
): {
  service: RegistraContrattoService;
  bozzaRepository: BozzaContrattoRepositoryFake;
  immobileRepository: ImmobileRepositoryFake;
  personaRepository: PersonaRepositoryFake;
  tipologiaRepository: TipologiaContrattualeRepositoryFake;
} {
  return {
    service: new RegistraContrattoService(
      bozzaRepository,
      immobileRepository,
      personaRepository,
      tipologiaRepository,
      new ContrattoRepositoryFake(),
      new RegistrazioneContrattoPortFake(),
      new GeneratoreDocumentoContrattoFake(),
      new DataCorrenteProviderFake(),
    ),
    bozzaRepository,
    immobileRepository,
    personaRepository,
    tipologiaRepository,
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

describe("RegistraContrattoService.inserisciNuovoImmobile", () => {
  test("rifiuta un immobile con dati catastali già presenti senza aggiornare la bozza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const immobileRepository = new ImmobileRepositoryFake();
    const bozzaEsistente = new BozzaContratto({
      stepCompletato: 3,
      nomeDescrizione: "Bozza da preservare",
    });

    bozzaRepository.bozza = bozzaEsistente;
    immobileRepository.duplicatoCatastale = creaImmobile(
      10,
      "Immobile esistente",
      30,
    );

    const { service } = creaService(
      bozzaRepository,
      immobileRepository,
    );

    await expect(
      service.inserisciNuovoImmobile(creaNuovoImmobileSenzaInterno()),
    ).rejects.toThrow("Dati catastali già associati a un immobile");

    expect(bozzaRepository.bozza).toBe(bozzaEsistente);
    expect(bozzaRepository.salvataggi).toBe(0);
    expect(immobileRepository.verificheIndirizzo).toBe(0);
  });

  test("senza interno non verifica il duplicato dell'indirizzo completo e salva l'immobile nella bozza", async () => {
    const immobileRepository = new ImmobileRepositoryFake();
    immobileRepository.indirizzoDuplicato = true;

    const { service, bozzaRepository } = creaService(
      new BozzaContrattoRepositoryFake(),
      immobileRepository,
    );
    const immobile = creaNuovoImmobileSenzaInterno();

    const bozza = await service.inserisciNuovoImmobile(immobile);

    expect(immobileRepository.verificheIndirizzo).toBe(0);
    expect(bozza.stepCompletato).toBe(1);
    expect(bozza.immobile).toBe(immobile);
    expect(bozzaRepository.bozza).toBe(bozza);
    expect(bozzaRepository.salvataggi).toBe(1);
  });

  test("con interno rifiuta un indirizzo completo già presente senza salvare la bozza", async () => {
    const immobileRepository = new ImmobileRepositoryFake();
    immobileRepository.indirizzoDuplicato = true;

    const { service, bozzaRepository } = creaService(
      new BozzaContrattoRepositoryFake(),
      immobileRepository,
    );

    await expect(
      service.inserisciNuovoImmobile(creaNuovoImmobileConInterno()),
    ).rejects.toThrow("Indirizzo completo già associato a un immobile");

    expect(immobileRepository.verificheIndirizzo).toBe(1);
    expect(bozzaRepository.bozza).toBeNull();
    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("con interno non duplicato salva il nuovo immobile soltanto nella bozza", async () => {
    const immobileRepository = new ImmobileRepositoryFake();
    const { service, bozzaRepository } = creaService(
      new BozzaContrattoRepositoryFake(),
      immobileRepository,
    );
    const immobile = creaNuovoImmobileConInterno();

    const bozza = await service.inserisciNuovoImmobile(immobile);

    expect(immobileRepository.verificheIndirizzo).toBe(1);
    expect(bozza.stepCompletato).toBe(1);
    expect(bozza.immobile).toBe(immobile);
    expect(bozzaRepository.bozza).toBe(bozza);
    expect(bozzaRepository.salvataggi).toBe(1);
    expect(immobile.id).toBeUndefined();
  });

  test("aggiorna una bozza già avanzata senza perdere gli altri dati né retrocedere lo step", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozzaEsistente = new BozzaContratto({
      stepCompletato: 4,
      nomeDescrizione: "Contratto esistente",
      dal: new Date("2026-10-01T00:00:00.000Z"),
      canoneMensile: 900,
      giornoPagamento: 10,
    });
    bozzaRepository.bozza = bozzaEsistente;

    const { service } = creaService(bozzaRepository);
    const immobile = creaNuovoImmobileSenzaInterno();

    const bozza = await service.inserisciNuovoImmobile(immobile);

    expect(bozza).toBe(bozzaEsistente);
    expect(bozza.stepCompletato).toBe(4);
    expect(bozza.immobile).toBe(immobile);
    expect(bozza.nomeDescrizione).toBe("Contratto esistente");
    expect(bozza.canoneMensile).toBe(900);
    expect(bozza.giornoPagamento).toBe(10);
    expect(bozzaRepository.salvataggi).toBe(1);
  });
});

describe("RegistraContrattoService.cercaPersona", () => {
  test("restituisce null quando il codice fiscale non è registrato", async () => {
    const { service } = creaService();

    await expect(
      service.cercaPersona("RSSMRA80A10H501U"),
    ).resolves.toBeNull();
  });

  test("restituisce una working copy indipendente mantenendo invariati id e codice fiscale", async () => {
    const personaRepository = new PersonaRepositoryFake();
    const registrata = creaPersona(
      "RSSMRA80A10H501U",
      true,
      12,
    );
    personaRepository.persone = [registrata];

    const { service } = creaService(
      new BozzaContrattoRepositoryFake(),
      new ImmobileRepositoryFake(),
      personaRepository,
    );

    const workingCopy = await service.cercaPersona(
      "RSSMRA80A10H501U",
    );

    expect(workingCopy).not.toBeNull();
    expect(workingCopy).not.toBe(registrata);
    expect(workingCopy?.id).toBe(12);
    expect(workingCopy?.codiceFiscale).toBe("RSSMRA80A10H501U");
    expect(workingCopy?.residenza).not.toBe(registrata.residenza);
    expect(workingCopy?.documento).not.toBe(registrata.documento);

    workingCopy?.aggiornaDatiAnagrafici(
      "Mario",
      "Rossi",
      "Milano",
      new Date("1980-01-10T00:00:00.000Z"),
    );
    workingCopy?.cambiaResidenza(
      new Indirizzo({
        provincia: "MI",
        comune: "Milano",
        indirizzo: "Via Modificata",
      }),
    );

    expect(registrata.luogoNascita).toBe("Roma");
    expect(registrata.residenza.comune).toBe("Roma");
  });
});

describe("RegistraContrattoService.impostaProprietario", () => {
  test("salva il proprietario nella bozza e completa lo step 2 senza richiedere un documento", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    bozzaRepository.bozza = creaBozzaConImmobile();

    const { service } = creaService(bozzaRepository);
    const proprietario = creaPersona("RSSMRA80A10H501U");

    const bozza = await service.impostaProprietario(proprietario);

    expect(bozza.stepCompletato).toBe(2);
    expect(bozza.proprietario).toBe(proprietario);
    expect(bozzaRepository.bozza).toBe(bozza);
    expect(bozzaRepository.salvataggi).toBe(1);
  });

  test("rifiuta il proprietario se lo step immobile non è completato", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const { service } = creaService(bozzaRepository);

    await expect(
      service.impostaProprietario(
        creaPersona("RSSMRA80A10H501U"),
      ),
    ).rejects.toThrow("Step immobile non completato");

    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("non fa retrocedere una bozza già avanzata", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    bozzaRepository.bozza = creaBozzaConImmobile(4);

    const { service } = creaService(bozzaRepository);

    const bozza = await service.impostaProprietario(
      creaPersona("RSSMRA80A10H501U"),
    );

    expect(bozza.stepCompletato).toBe(4);
    expect(bozzaRepository.salvataggi).toBe(1);
  });
});

describe("RegistraContrattoService.impostaInquilino", () => {
  test("rifiuta l'inquilino se lo step proprietario non è completato", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    bozzaRepository.bozza = creaBozzaConImmobile();

    const { service } = creaService(bozzaRepository);

    await expect(
      service.impostaInquilino(
        creaPersona("VRDLGI90B20H501X", true),
      ),
    ).rejects.toThrow("Step proprietario non completato");

    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("rifiuta un inquilino senza documento lasciando invariata la bozza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(2);
    const proprietario = creaPersona("RSSMRA80A10H501U");
    bozza.proprietario = proprietario;
    bozzaRepository.bozza = bozza;

    const { service } = creaService(bozzaRepository);

    await expect(
      service.impostaInquilino(
        creaPersona("VRDLGI90B20H501X"),
      ),
    ).rejects.toThrow(
      "Documento di riconoscimento obbligatorio per l'inquilino",
    );

    expect(bozzaRepository.bozza).toBe(bozza);
    expect(bozzaRepository.bozza?.proprietario).toBe(proprietario);
    expect(bozzaRepository.bozza?.inquilino).toBeUndefined();
    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("salva l'inquilino con documento e completa lo step 3", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(2);
    bozza.proprietario = creaPersona("RSSMRA80A10H501U");
    bozzaRepository.bozza = bozza;

    const { service } = creaService(bozzaRepository);
    const inquilino = creaPersona(
      "VRDLGI90B20H501X",
      true,
    );

    const aggiornata = await service.impostaInquilino(inquilino);

    expect(aggiornata.stepCompletato).toBe(3);
    expect(aggiornata.inquilino).toBe(inquilino);
    expect(bozzaRepository.bozza).toBe(aggiornata);
    expect(bozzaRepository.salvataggi).toBe(1);
  });

  test("non fa retrocedere una bozza già avanzata", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(4);
    bozza.proprietario = creaPersona("RSSMRA80A10H501U");
    bozzaRepository.bozza = bozza;

    const { service } = creaService(bozzaRepository);

    const aggiornata = await service.impostaInquilino(
      creaPersona("VRDLGI90B20H501X", true),
    );

    expect(aggiornata.stepCompletato).toBe(4);
    expect(bozzaRepository.salvataggi).toBe(1);
  });
});

describe("RegistraContrattoService.elencaTipologie", () => {
  test("restituisce le tipologie contrattuali disponibili", async () => {
    const tipologiaRepository = new TipologiaContrattualeRepositoryFake();
    const concordato = creaTipologia(1);
    const libero = creaTipologia(2, "Canone libero", 4, 4);
    tipologiaRepository.tipologie = [concordato, libero];

    const { service } = creaService(
      new BozzaContrattoRepositoryFake(),
      new ImmobileRepositoryFake(),
      new PersonaRepositoryFake(),
      tipologiaRepository,
    );

    await expect(service.elencaTipologie()).resolves.toEqual([
      concordato,
      libero,
    ]);
  });
});

describe("RegistraContrattoService.impostaDatiContrattuali", () => {
  test("rifiuta i dati contrattuali se lo step inquilino non è completato", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(2);
    bozza.proprietario = creaPersona("RSSMRA80A10H501U");
    bozzaRepository.bozza = bozza;

    const { service, tipologiaRepository } = creaService(bozzaRepository);
    tipologiaRepository.tipologie = [creaTipologia(1)];

    await expect(
      service.impostaDatiContrattuali(
        "Contratto Rossi",
        1,
        new Date("2026-10-01T00:00:00.000Z"),
        900,
        10,
      ),
    ).rejects.toThrow("Step inquilino non completato");

    expect(bozzaRepository.salvataggi).toBe(0);
    expect(tipologiaRepository.ricercheConArticoli).toBe(0);
  });

  test("rifiuta un nome o descrizione vuoto senza modificare la bozza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaCompletaFinoInquilino();
    bozzaRepository.bozza = bozza;

    const { service, tipologiaRepository } = creaService(bozzaRepository);
    tipologiaRepository.tipologie = [creaTipologia(1)];

    await expect(
      service.impostaDatiContrattuali(
        "   ",
        1,
        new Date("2026-10-01T00:00:00.000Z"),
        900,
        10,
      ),
    ).rejects.toThrow("Nome o descrizione del contratto obbligatorio");

    expect(bozzaRepository.bozza).toBe(bozza);
    expect(bozzaRepository.salvataggi).toBe(0);
    expect(tipologiaRepository.ricercheConArticoli).toBe(0);
  });

  test.each([0, 29])(
    "rifiuta il giorno di pagamento non valido %i senza modificare la bozza",
    async (giornoPagamento) => {
      const bozzaRepository = new BozzaContrattoRepositoryFake();
      const bozza = creaBozzaCompletaFinoInquilino();
      bozzaRepository.bozza = bozza;

      const { service, tipologiaRepository } = creaService(
        bozzaRepository,
      );
      tipologiaRepository.tipologie = [creaTipologia(1)];

      await expect(
        service.impostaDatiContrattuali(
          "Contratto Rossi",
          1,
          new Date("2026-10-01T00:00:00.000Z"),
          900,
          giornoPagamento,
        ),
      ).rejects.toThrow(RangeError);

      expect(bozzaRepository.bozza).toBe(bozza);
      expect(bozzaRepository.salvataggi).toBe(0);
      expect(tipologiaRepository.ricercheConArticoli).toBe(0);
    },
  );

  test("rifiuta una tipologia inesistente senza modificare la bozza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaCompletaFinoInquilino();
    bozzaRepository.bozza = bozza;

    const { service, tipologiaRepository } = creaService(bozzaRepository);

    await expect(
      service.impostaDatiContrattuali(
        "Contratto Rossi",
        999,
        new Date("2026-10-01T00:00:00.000Z"),
        900,
        10,
      ),
    ).rejects.toThrow("Tipologia contrattuale non trovata");

    expect(tipologiaRepository.ricercheConArticoli).toBe(1);
    expect(bozzaRepository.bozza).toBe(bozza);
    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test.each([1, 28])(
    "accetta il giorno di pagamento limite %i e completa i dati contrattuali",
    async (giornoPagamento) => {
      const bozzaRepository = new BozzaContrattoRepositoryFake();
      bozzaRepository.bozza = creaBozzaCompletaFinoInquilino();

      const tipologiaRepository =
        new TipologiaContrattualeRepositoryFake();
      const tipologia = creaTipologia(1);
      tipologiaRepository.tipologie = [tipologia];

      const { service } = creaService(
        bozzaRepository,
        new ImmobileRepositoryFake(),
        new PersonaRepositoryFake(),
        tipologiaRepository,
      );

      const dal = new Date("2026-10-15T00:00:00.000Z");
      const bozza = await service.impostaDatiContrattuali(
        "Contratto Rossi",
        1,
        dal,
        900,
        giornoPagamento,
      );

      expect(bozza.stepCompletato).toBe(4);
      expect(bozza.nomeDescrizione).toBe("Contratto Rossi");
      expect(bozza.tipologia).toBe(tipologia);
      expect(bozza.tipologia?.articoli).toHaveLength(2);
      expect(bozza.dal).toEqual(dal);
      expect(bozza.dal).not.toBe(dal);
      expect(bozza.al).toEqual(
        new Date("2029-10-14T00:00:00.000Z"),
      );
      expect(bozza.canoneMensile).toBe(900);
      expect(bozza.giornoPagamento).toBe(giornoPagamento);
      expect(bozzaRepository.bozza).toBe(bozza);
      expect(bozzaRepository.salvataggi).toBe(1);
    },
  );

  test("aggiorna i dati contrattuali senza perdere i dati degli step precedenti né retrocedere lo step", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozzaEsistente = creaBozzaCompletaFinoInquilino(4);
    const immobile = bozzaEsistente.immobile;
    const proprietario = bozzaEsistente.proprietario;
    const inquilino = bozzaEsistente.inquilino;
    bozzaRepository.bozza = bozzaEsistente;

    const tipologiaRepository =
      new TipologiaContrattualeRepositoryFake();
    const libero = creaTipologia(2, "Canone libero", 4, 4);
    tipologiaRepository.tipologie = [libero];

    const { service } = creaService(
      bozzaRepository,
      new ImmobileRepositoryFake(),
      new PersonaRepositoryFake(),
      tipologiaRepository,
    );

    const aggiornata = await service.impostaDatiContrattuali(
      "Contratto aggiornato",
      2,
      new Date("2027-01-01T00:00:00.000Z"),
      1200,
      15,
    );

    expect(aggiornata).toBe(bozzaEsistente);
    expect(aggiornata.stepCompletato).toBe(4);
    expect(aggiornata.immobile).toBe(immobile);
    expect(aggiornata.proprietario).toBe(proprietario);
    expect(aggiornata.inquilino).toBe(inquilino);
    expect(aggiornata.tipologia).toBe(libero);
    expect(aggiornata.al).toEqual(
      new Date("2030-12-31T00:00:00.000Z"),
    );
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
