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
  bozze: BozzaContratto[] = [];
  eliminazioni: number[] = [];
  salvataggi = 0;
  prossimoId = 1;

  async elenca(): Promise<BozzaContratto[]> {
    return [...this.bozze];
  }

  async trovaPerId(idBozza: number): Promise<BozzaContratto | null> {
    return this.bozze.find((bozza) => bozza.idBozza === idBozza) ?? null;
  }

  async trovaPerImmobileId(
    immobileId: number,
  ): Promise<BozzaContratto | null> {
    return (
      this.bozze.find((bozza) => bozza.immobile?.id === immobileId) ?? null
    );
  }

  async salva(bozza: BozzaContratto): Promise<BozzaContratto> {
    this.salvataggi += 1;

    if (bozza.idBozza === undefined) {
      bozza.idBozza = this.prossimoId;
      this.prossimoId += 1;
      this.bozze.push(bozza);
      return bozza;
    }

    const indice = this.bozze.findIndex(
      (esistente) => esistente.idBozza === bozza.idBozza,
    );

    if (indice === -1) {
      this.bozze.push(bozza);
    } else {
      this.bozze[indice] = bozza;
    }

    return bozza;
  }

  async elimina(idBozza: number): Promise<void> {
    this.eliminazioni.push(idBozza);
    this.bozze = this.bozze.filter((bozza) => bozza.idBozza !== idBozza);
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

  async esisteSovrapposizione(
    _immobileId: number,
    _dal: Date,
    _al: Date,
  ): Promise<boolean> {
    return false;
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

function creaBozzaConImmobile(
  idBozza = 1,
  stepCompletato = 1,
): BozzaContratto {
  return new BozzaContratto({
    idBozza,
    stepCompletato,
    immobile: creaImmobile(1, "Casa Roma", 10),
  });
}

function creaBozzaCompletaFinoInquilino(
  idBozza = 1,
  stepCompletato = 3,
): BozzaContratto {
  const bozza = creaBozzaConImmobile(idBozza, stepCompletato);
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
  test("restituisce un elenco vuoto quando non esistono bozze", async () => {
    const { service } = creaService();

    await expect(service.avvia()).resolves.toEqual([]);
  });

  test("restituisce tutte le bozze riprendibili", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const prima = new BozzaContratto({
      idBozza: 1,
      stepCompletato: 1,
      immobile: creaImmobile(1, "Casa Roma", 10),
    });
    const seconda = new BozzaContratto({
      idBozza: 2,
      stepCompletato: 2,
      immobile: creaImmobile(2, "Casa Milano", 20),
      proprietario: creaPersona("RSSMRA80A10H501U"),
    });
    bozzaRepository.bozze = [prima, seconda];

    const { service } = creaService(bozzaRepository);

    await expect(service.avvia()).resolves.toEqual([prima, seconda]);
    expect(bozzaRepository.eliminazioni).toEqual([]);
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

    await expect(service.elencaImmobili()).resolves.toEqual([primo, secondo]);
  });
});

describe("RegistraContrattoService.selezionaImmobile", () => {
  test("crea una nuova bozza identificata per l'immobile selezionato", async () => {
    const immobileRepository = new ImmobileRepositoryFake();
    const immobile = creaImmobile(2, "Casa Roma", 20);
    immobileRepository.immobili = [immobile];

    const { service, bozzaRepository } = creaService(
      new BozzaContrattoRepositoryFake(),
      immobileRepository,
    );

    const bozza = await service.selezionaImmobile(2);

    expect(bozza.idBozza).toBe(1);
    expect(bozza.stepCompletato).toBe(1);
    expect(bozza.immobile).toBe(immobile);
    expect(bozzaRepository.bozze).toEqual([bozza]);
    expect(bozzaRepository.salvataggi).toBe(1);
  });

  test("rifiuta un id immobile inesistente senza creare bozze", async () => {
    const { service, bozzaRepository } = creaService();

    await expect(service.selezionaImmobile(999)).rejects.toThrow(
      "Immobile non trovato",
    );

    expect(bozzaRepository.bozze).toEqual([]);
    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("impedisce una seconda bozza per lo stesso immobile registrato", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const immobileRepository = new ImmobileRepositoryFake();
    const immobile = creaImmobile(1, "Casa Roma", 10);
    const esistente = creaBozzaConImmobile(7);
    bozzaRepository.bozze = [esistente];
    bozzaRepository.prossimoId = 8;
    immobileRepository.immobili = [immobile];

    const { service } = creaService(bozzaRepository, immobileRepository);

    await expect(service.selezionaImmobile(1)).rejects.toThrow(
      "Esiste già una bozza per l'immobile selezionato",
    );
    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("consente di mantenere lo stesso immobile quando si modifica la relativa bozza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const immobileRepository = new ImmobileRepositoryFake();
    const immobile = creaImmobile(1, "Casa Roma", 10);
    const esistente = creaBozzaConImmobile(7, 4);
    esistente.nomeDescrizione = "Contratto esistente";
    bozzaRepository.bozze = [esistente];
    immobileRepository.immobili = [immobile];

    const { service } = creaService(bozzaRepository, immobileRepository);

    const aggiornata = await service.selezionaImmobile(1, 7);

    expect(aggiornata).toBe(esistente);
    expect(aggiornata.stepCompletato).toBe(4);
    expect(aggiornata.nomeDescrizione).toBe("Contratto esistente");
    expect(bozzaRepository.bozze).toEqual([esistente]);
  });
});

describe("RegistraContrattoService.inserisciNuovoImmobile", () => {
  test("rifiuta dati catastali già presenti senza modificare la bozza indicata", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(3, 3);
    bozzaRepository.bozze = [bozza];
    const immobileRepository = new ImmobileRepositoryFake();
    immobileRepository.duplicatoCatastale = creaImmobile(
      10,
      "Immobile esistente",
      30,
    );

    const { service } = creaService(bozzaRepository, immobileRepository);

    await expect(
      service.inserisciNuovoImmobile(creaNuovoImmobileSenzaInterno(), 3),
    ).rejects.toThrow("Dati catastali già associati a un immobile");

    expect(bozzaRepository.bozze).toEqual([bozza]);
    expect(bozzaRepository.salvataggi).toBe(0);
    expect(immobileRepository.verificheIndirizzo).toBe(0);
  });

  test("senza interno non verifica il duplicato dell'indirizzo e crea una bozza", async () => {
    const immobileRepository = new ImmobileRepositoryFake();
    immobileRepository.indirizzoDuplicato = true;
    const { service, bozzaRepository } = creaService(
      new BozzaContrattoRepositoryFake(),
      immobileRepository,
    );
    const immobile = creaNuovoImmobileSenzaInterno();

    const bozza = await service.inserisciNuovoImmobile(immobile);

    expect(immobileRepository.verificheIndirizzo).toBe(0);
    expect(bozza.idBozza).toBe(1);
    expect(bozza.immobile).toBe(immobile);
    expect(immobile.id).toBeUndefined();
    expect(bozzaRepository.bozze).toEqual([bozza]);
  });

  test("con interno rifiuta un indirizzo completo già presente", async () => {
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
    expect(bozzaRepository.bozze).toEqual([]);
  });
});

describe("RegistraContrattoService.cercaPersona", () => {
  test("restituisce null quando il codice fiscale non è registrato", async () => {
    const { service } = creaService();

    await expect(service.cercaPersona("RSSMRA80A10H501U")).resolves.toBeNull();
  });

  test("restituisce una working copy indipendente mantenendo id e codice fiscale", async () => {
    const personaRepository = new PersonaRepositoryFake();
    const registrata = creaPersona("RSSMRA80A10H501U", true, 12);
    personaRepository.persone = [registrata];
    const { service } = creaService(
      new BozzaContrattoRepositoryFake(),
      new ImmobileRepositoryFake(),
      personaRepository,
    );

    const workingCopy = await service.cercaPersona("RSSMRA80A10H501U");

    expect(workingCopy).not.toBeNull();
    expect(workingCopy).not.toBe(registrata);
    expect(workingCopy?.id).toBe(12);
    expect(workingCopy?.codiceFiscale).toBe("RSSMRA80A10H501U");
    expect(workingCopy?.residenza).not.toBe(registrata.residenza);
    expect(workingCopy?.documento).not.toBe(registrata.documento);
  });
});

describe("RegistraContrattoService.impostaProprietario", () => {
  test("aggiorna soltanto la bozza indicata", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const prima = creaBozzaConImmobile(1);
    const seconda = new BozzaContratto({
      idBozza: 2,
      stepCompletato: 1,
      immobile: creaImmobile(2, "Casa Milano", 20),
    });
    bozzaRepository.bozze = [prima, seconda];
    const { service } = creaService(bozzaRepository);
    const proprietario = creaPersona("RSSMRA80A10H501U");

    const aggiornata = await service.impostaProprietario(2, proprietario);

    expect(aggiornata.idBozza).toBe(2);
    expect(aggiornata.proprietario).toBe(proprietario);
    expect(aggiornata.stepCompletato).toBe(2);
    expect(prima.proprietario).toBeUndefined();
  });

  test("rifiuta un identificatore di bozza inesistente", async () => {
    const { service } = creaService();

    await expect(
      service.impostaProprietario(999, creaPersona("RSSMRA80A10H501U")),
    ).rejects.toThrow("Bozza del contratto non disponibile");
  });
});

describe("RegistraContrattoService.impostaInquilino", () => {
  test("rifiuta un inquilino senza documento lasciando invariata la bozza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(1, 2);
    bozza.proprietario = creaPersona("RSSMRA80A10H501U");
    bozzaRepository.bozze = [bozza];
    const { service } = creaService(bozzaRepository);

    await expect(
      service.impostaInquilino(1, creaPersona("VRDLGI90B20H501X")),
    ).rejects.toThrow(
      "Documento di riconoscimento obbligatorio per l'inquilino",
    );

    expect(bozza.inquilino).toBeUndefined();
    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("salva l'inquilino con documento nella bozza indicata", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(1, 2);
    bozza.proprietario = creaPersona("RSSMRA80A10H501U");
    bozzaRepository.bozze = [bozza];
    const { service } = creaService(bozzaRepository);
    const inquilino = creaPersona("VRDLGI90B20H501X", true);

    const aggiornata = await service.impostaInquilino(1, inquilino);

    expect(aggiornata.stepCompletato).toBe(3);
    expect(aggiornata.inquilino).toBe(inquilino);
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
  test("calcola e memorizza al nella bozza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    bozzaRepository.bozze = [creaBozzaCompletaFinoInquilino(1)];
    const tipologiaRepository = new TipologiaContrattualeRepositoryFake();
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
      1,
      "Contratto Rossi",
      1,
      dal,
      900,
      10,
    );

    expect(bozza.stepCompletato).toBe(4);
    expect(bozza.dal).toEqual(dal);
    expect(bozza.dal).not.toBe(dal);
    expect(bozza.al).toEqual(new Date("2029-10-14T00:00:00.000Z"));
    expect(bozza.nomeDescrizione).toBe("Contratto Rossi");
    expect(bozza.tipologia).toBe(tipologia);
  });

  test("ricalcola al quando cambiano tipologia o decorrenza", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaCompletaFinoInquilino(1, 4);
    bozza.dal = new Date("2026-01-01T00:00:00.000Z");
    bozza.al = new Date("2028-12-31T00:00:00.000Z");
    bozzaRepository.bozze = [bozza];
    const tipologiaRepository = new TipologiaContrattualeRepositoryFake();
    const libero = creaTipologia(2, "Canone libero", 4, 4);
    tipologiaRepository.tipologie = [libero];
    const { service } = creaService(
      bozzaRepository,
      new ImmobileRepositoryFake(),
      new PersonaRepositoryFake(),
      tipologiaRepository,
    );

    const aggiornata = await service.impostaDatiContrattuali(
      1,
      "Contratto aggiornato",
      2,
      new Date("2027-01-01T00:00:00.000Z"),
      1200,
      15,
    );

    expect(aggiornata.al).toEqual(new Date("2030-12-31T00:00:00.000Z"));
    expect(aggiornata.stepCompletato).toBe(4);
  });

  test("rifiuta dati contrattuali se lo step inquilino non è completato", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const bozza = creaBozzaConImmobile(1, 2);
    bozza.proprietario = creaPersona("RSSMRA80A10H501U");
    bozzaRepository.bozze = [bozza];
    const { service, tipologiaRepository } = creaService(bozzaRepository);
    tipologiaRepository.tipologie = [creaTipologia(1)];

    await expect(
      service.impostaDatiContrattuali(
        1,
        "Contratto Rossi",
        1,
        new Date("2026-10-01T00:00:00.000Z"),
        900,
        10,
      ),
    ).rejects.toThrow("Step inquilino non completato");
  });

  test.each([0, 29])(
    "rifiuta il giorno di pagamento non valido %i",
    async (giornoPagamento) => {
      const bozzaRepository = new BozzaContrattoRepositoryFake();
      bozzaRepository.bozze = [creaBozzaCompletaFinoInquilino(1)];
      const { service, tipologiaRepository } = creaService(bozzaRepository);
      tipologiaRepository.tipologie = [creaTipologia(1)];

      await expect(
        service.impostaDatiContrattuali(
          1,
          "Contratto Rossi",
          1,
          new Date("2026-10-01T00:00:00.000Z"),
          900,
          giornoPagamento,
        ),
      ).rejects.toThrow(RangeError);
    },
  );
});

describe("RegistraContrattoService.annulla", () => {
  test("elimina soltanto la bozza indicata", async () => {
    const bozzaRepository = new BozzaContrattoRepositoryFake();
    const prima = creaBozzaConImmobile(1);
    const seconda = new BozzaContratto({
      idBozza: 2,
      stepCompletato: 1,
      immobile: creaImmobile(2, "Casa Milano", 20),
    });
    bozzaRepository.bozze = [prima, seconda];
    const { service } = creaService(bozzaRepository);

    await service.annulla(1);

    expect(bozzaRepository.eliminazioni).toEqual([1]);
    expect(bozzaRepository.bozze).toEqual([seconda]);
  });
});
