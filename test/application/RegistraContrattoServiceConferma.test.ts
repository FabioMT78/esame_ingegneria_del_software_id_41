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
  eliminazioni = 0;
  erroreEliminazione = false;

  async recupera(): Promise<BozzaContratto | null> {
    return this.bozza;
  }

  async salva(bozza: BozzaContratto): Promise<void> {
    this.bozza = bozza;
  }

  async elimina(): Promise<void> {
    this.eliminazioni += 1;

    if (this.erroreEliminazione) {
      throw new Error("cleanup fallito");
    }

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
    dati: DatiCatastali,
  ): Promise<Immobile | null> {
    return (
      this.immobili.find(
        (immobile) =>
          immobile.datiCatastali.codiceComunale === dati.codiceComunale &&
          immobile.datiCatastali.foglio === dati.foglio &&
          immobile.datiCatastali.particella === dati.particella &&
          immobile.datiCatastali.subalterno === dati.subalterno,
      ) ?? null
    );
  }

  async esisteConIndirizzo(_indirizzo: Indirizzo): Promise<boolean> {
    return false;
  }
}

class PersonaRepositoryFake implements PersonaRepository {
  async trovaPerCodiceFiscale(
    _codiceFiscale: string,
  ): Promise<Persona | null> {
    return null;
  }
}

class TipologiaContrattualeRepositoryFake
  implements TipologiaContrattualeRepository
{
  async trovaTutte(): Promise<TipologiaContrattuale[]> {
    return [];
  }

  async trovaPerIdConArticoli(
    _id: number,
  ): Promise<TipologiaContrattuale | null> {
    return null;
  }
}

class ContrattoRepositoryFake implements ContrattoRepository {
  contratti: Contratto[] = [];

  async trovaPerId(id: number): Promise<Contratto | null> {
    return this.contratti.find((contratto) => contratto.id === id) ?? null;
  }

  async trovaPerImmobile(immobileId: number): Promise<Contratto[]> {
    return this.contratti.filter(
      (contratto) => contratto.immobile.id === immobileId,
    );
  }
}

class RegistrazioneContrattoPortFake
  implements RegistrazioneContrattoPort
{
  contrattoRegistrato: Contratto | null = null;
  errore: Error | null = null;

  async registraDefinitivamente(contratto: Contratto): Promise<void> {
    if (this.errore !== null) {
      throw this.errore;
    }

    this.contrattoRegistrato = contratto;
  }
}

class GeneratoreDocumentoContrattoFake
  implements GeneratoreDocumentoContratto
{
  contenuto = "<article>Documento definitivo</article>";
  contrattoRicevuto: Contratto | null = null;

  genera(contratto: Contratto): string {
    this.contrattoRicevuto = contratto;
    return this.contenuto;
  }
}

class DataCorrenteProviderFake implements DataCorrenteProvider {
  data = new Date("2026-09-12T00:00:00.000Z");

  oggi(): Date {
    return new Date(this.data.getTime());
  }
}

function creaImmobile(id?: number): Immobile {
  return new Immobile({
    ...(id !== undefined ? { id } : {}),
    nome: "Casa Roma",
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Esempio",
      civico: "10",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 1,
      particella: 10,
      subalterno: 1,
      categoria: "A/2",
      consistenza: 5,
      rendita: 1000,
    }),
  });
}

function creaPersona(
  codiceFiscale: string,
  conDocumento = false,
): Persona {
  const persona = new Persona({
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

function creaTipologia(): TipologiaContrattuale {
  return new TipologiaContrattuale({
    id: 1,
    denominazione: "Canone concordato",
    durata: 3,
    rinnovo: 2,
    articoli: [
      new Articolo({
        id: 1,
        numArticolo: 1,
        numParte: 0,
        titolo: "Oggetto",
        descrizione: "Testo articolo",
      }),
    ],
  });
}

function creaBozzaCompleta(
  dal = new Date("2026-06-01T00:00:00.000Z"),
  immobile = creaImmobile(1),
): BozzaContratto {
  return new BozzaContratto({
    stepCompletato: 4,
    immobile,
    proprietario: creaPersona("RSSMRA80A10H501U"),
    inquilino: creaPersona("VRDLGI90B20H501X", true),
    tipologia: creaTipologia(),
    nomeDescrizione: "Contratto Rossi",
    dal,
    canoneMensile: 1000,
    giornoPagamento: 15,
  });
}

function creaContrattoRegistrato(
  dal = new Date("2026-06-01T00:00:00.000Z"),
  immobile = creaImmobile(1),
  codiceFiscaleInquilino = "VRDLGI90B20H501X",
): Contratto {
  return new Contratto({
    id: 10,
    nomeDescrizione: "Contratto registrato",
    immobile,
    proprietario: creaPersona("RSSMRA80A10H501U"),
    inquilino: creaPersona(codiceFiscaleInquilino, true),
    tipologia: creaTipologia(),
    dal,
    canoneMensile: 1000,
    giornoPagamento: 15,
    registratoIl: new Date("2026-05-20T00:00:00.000Z"),
  });
}

function creaScenario(): {
  service: RegistraContrattoService;
  bozzaRepository: BozzaContrattoRepositoryFake;
  immobileRepository: ImmobileRepositoryFake;
  contrattoRepository: ContrattoRepositoryFake;
  registrazionePort: RegistrazioneContrattoPortFake;
  generatore: GeneratoreDocumentoContrattoFake;
  dataProvider: DataCorrenteProviderFake;
} {
  const bozzaRepository = new BozzaContrattoRepositoryFake();
  const immobileRepository = new ImmobileRepositoryFake();
  const contrattoRepository = new ContrattoRepositoryFake();
  const registrazionePort = new RegistrazioneContrattoPortFake();
  const generatore = new GeneratoreDocumentoContrattoFake();
  const dataProvider = new DataCorrenteProviderFake();

  return {
    service: new RegistraContrattoService(
      bozzaRepository,
      immobileRepository,
      new PersonaRepositoryFake(),
      new TipologiaContrattualeRepositoryFake(),
      contrattoRepository,
      registrazionePort,
      generatore,
      dataProvider,
    ),
    bozzaRepository,
    immobileRepository,
    contrattoRepository,
    registrazionePort,
    generatore,
    dataProvider,
  };
}

describe("RegistraContrattoService.avvia - bozza residua", () => {
  test("elimina una bozza completa che coincide con un contratto già registrato", async () => {
    const scenario = creaScenario();
    const immobilePersistito = creaImmobile(1);
    scenario.immobileRepository.immobili = [immobilePersistito];
    scenario.bozzaRepository.bozza = creaBozzaCompleta(
      new Date("2026-06-01T00:00:00.000Z"),
      creaImmobile(),
    );
    scenario.contrattoRepository.contratti = [
      creaContrattoRegistrato(
        new Date("2026-06-01T00:00:00.000Z"),
        immobilePersistito,
      ),
    ];

    await expect(scenario.service.avvia()).resolves.toBeNull();

    expect(scenario.bozzaRepository.eliminazioni).toBe(1);
    expect(scenario.bozzaRepository.bozza).toBeNull();
  });

  test("mantiene la bozza quando il codice fiscale dell'inquilino non coincide", async () => {
    const scenario = creaScenario();
    const immobilePersistito = creaImmobile(1);
    const bozza = creaBozzaCompleta(
      new Date("2026-06-01T00:00:00.000Z"),
      immobilePersistito,
    );
    scenario.immobileRepository.immobili = [immobilePersistito];
    scenario.bozzaRepository.bozza = bozza;
    scenario.contrattoRepository.contratti = [
      creaContrattoRegistrato(
        new Date("2026-06-01T00:00:00.000Z"),
        immobilePersistito,
        "BNCLCU90A01H501Z",
      ),
    ];

    await expect(scenario.service.avvia()).resolves.toBe(bozza);

    expect(scenario.bozzaRepository.eliminazioni).toBe(0);
  });

  test("mantiene una bozza ancora incompleta senza interrogare i contratti", async () => {
    const scenario = creaScenario();
    const bozza = new BozzaContratto({
      stepCompletato: 1,
      immobile: creaImmobile(1),
    });
    scenario.bozzaRepository.bozza = bozza;

    await expect(scenario.service.avvia()).resolves.toBe(bozza);

    expect(scenario.bozzaRepository.eliminazioni).toBe(0);
  });
});

describe("RegistraContrattoService.conferma", () => {
  test("rifiuta una bozza incompleta senza registrare nulla", async () => {
    const scenario = creaScenario();
    scenario.bozzaRepository.bozza = new BozzaContratto({
      stepCompletato: 3,
      immobile: creaImmobile(1),
    });

    await expect(scenario.service.conferma()).rejects.toThrow(
      "Bozza del contratto incompleta",
    );

    expect(scenario.registrazionePort.contrattoRegistrato).toBeNull();
    expect(scenario.bozzaRepository.eliminazioni).toBe(0);
  });

  test("impedisce la registrazione quando il periodo si sovrappone", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozza = creaBozzaCompleta(
      new Date("2027-01-01T00:00:00.000Z"),
      immobile,
    );
    scenario.contrattoRepository.contratti = [
      creaContrattoRegistrato(
        new Date("2026-06-01T00:00:00.000Z"),
        immobile,
      ),
    ];

    await expect(scenario.service.conferma()).rejects.toThrow(
      "Il periodo del contratto si sovrappone a un contratto esistente",
    );

    expect(scenario.registrazionePort.contrattoRegistrato).toBeNull();
    expect(scenario.bozzaRepository.eliminazioni).toBe(0);
  });

  test("registra il contratto definitivo, genera il contenuto e crea la prima mensilità", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozza = creaBozzaCompleta(
      new Date("2026-06-01T00:00:00.000Z"),
      immobile,
    );

    await scenario.service.conferma();

    const contratto = scenario.registrazionePort.contrattoRegistrato;
    expect(contratto).not.toBeNull();
    expect(contratto?.registratoIl).toEqual(scenario.dataProvider.data);
    expect(contratto?.contenuto).toBe(
      "<article>Documento definitivo</article>",
    );
    expect(scenario.generatore.contrattoRicevuto).toBe(contratto);
    expect(contratto?.pagamenti).toHaveLength(1);
    expect(contratto?.pagamenti[0]?.annoCompetenza).toBe(2026);
    expect(contratto?.pagamenti[0]?.meseCompetenza).toBe(6);
    expect(contratto?.pagamenti[0]?.dataPagamento).toEqual(
      new Date("2026-06-01T00:00:00.000Z"),
    );
    expect(contratto?.pagamenti[0]?.importo).toBe(1000);
    expect(scenario.bozzaRepository.bozza).toBeNull();
  });

  test("calcola in pro-rata la prima mensilità quando la decorrenza è a mese iniziato", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozza = creaBozzaCompleta(
      new Date("2026-06-15T00:00:00.000Z"),
      immobile,
    );

    await scenario.service.conferma();

    expect(
      scenario.registrazionePort.contrattoRegistrato?.pagamenti[0]
        ?.importo,
    ).toBe(533.33);
  });

  test("mantiene la bozza quando la registrazione definitiva fallisce", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    const bozza = creaBozzaCompleta(
      new Date("2026-06-01T00:00:00.000Z"),
      immobile,
    );
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozza = bozza;
    scenario.registrazionePort.errore = new Error(
      "registrazione fallita",
    );

    await expect(scenario.service.conferma()).rejects.toThrow(
      "registrazione fallita",
    );

    expect(scenario.bozzaRepository.bozza).toBe(bozza);
    expect(scenario.bozzaRepository.eliminazioni).toBe(0);
  });

  test("considera riuscita la conferma anche se il cleanup della bozza fallisce", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    const bozza = creaBozzaCompleta(
      new Date("2026-06-01T00:00:00.000Z"),
      immobile,
    );
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozza = bozza;
    scenario.bozzaRepository.erroreEliminazione = true;

    await expect(scenario.service.conferma()).resolves.toBeUndefined();

    expect(scenario.registrazionePort.contrattoRegistrato).not.toBeNull();
    expect(scenario.bozzaRepository.bozza).toBe(bozza);
    expect(scenario.bozzaRepository.eliminazioni).toBe(1);
  });
});
