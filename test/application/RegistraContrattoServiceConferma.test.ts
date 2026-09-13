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
  erroreEliminazioneId: number | null = null;
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
    if (bozza.idBozza === undefined) {
      bozza.idBozza = this.prossimoId;
      this.prossimoId += 1;
      this.bozze.push(bozza);
    }

    return bozza;
  }

  async elimina(idBozza: number): Promise<void> {
    this.eliminazioni.push(idBozza);

    if (this.erroreEliminazioneId === idBozza) {
      throw new Error("cleanup fallito");
    }

    this.bozze = this.bozze.filter((bozza) => bozza.idBozza !== idBozza);
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

type VerificaSovrapposizione = {
  immobileId: number;
  dal: Date;
  al: Date;
};

class ContrattoRepositoryFake implements ContrattoRepository {
  contratti: Contratto[] = [];
  sovrapposizione = false;
  verificheSovrapposizione: VerificaSovrapposizione[] = [];
  ricerchePerImmobile = 0;

  async trovaPerId(id: number): Promise<Contratto | null> {
    return this.contratti.find((contratto) => contratto.id === id) ?? null;
  }

  async trovaPerImmobile(immobileId: number): Promise<Contratto[]> {
    this.ricerchePerImmobile += 1;
    return this.contratti.filter(
      (contratto) => contratto.immobile.id === immobileId,
    );
  }

  async esisteSovrapposizione(
    immobileId: number,
    dal: Date,
    al: Date,
  ): Promise<boolean> {
    this.verificheSovrapposizione.push({
      immobileId,
      dal: new Date(dal.getTime()),
      al: new Date(al.getTime()),
    });
    return this.sovrapposizione;
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

function creaImmobile(id?: number, particella = 10): Immobile {
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
      particella,
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
  idBozza = 1,
  dal = new Date("2026-06-01T00:00:00.000Z"),
  immobile = creaImmobile(1),
): BozzaContratto {
  const tipologia = creaTipologia();
  return new BozzaContratto({
    idBozza,
    stepCompletato: 4,
    immobile,
    proprietario: creaPersona("RSSMRA80A10H501U"),
    inquilino: creaPersona("VRDLGI90B20H501X", true),
    tipologia,
    nomeDescrizione: "Contratto Rossi",
    dal,
    al: Contratto.calcolaDataFine(dal, tipologia),
    canoneMensile: 1000,
    giornoPagamento: 15,
  });
}

function creaContrattoRegistrato(
  dal = new Date("2026-06-01T00:00:00.000Z"),
  immobile = creaImmobile(1),
  codiceFiscaleInquilino = "VRDLGI90B20H501X",
): Contratto {
  const tipologia = creaTipologia();
  return new Contratto({
    id: 10,
    nomeDescrizione: "Contratto registrato",
    immobile,
    proprietario: creaPersona("RSSMRA80A10H501U"),
    inquilino: creaPersona(codiceFiscaleInquilino, true),
    tipologia,
    dal,
    al: Contratto.calcolaDataFine(dal, tipologia),
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

describe("RegistraContrattoService.avvia - bozze residue", () => {
  test("elimina soltanto la bozza residua e restituisce le altre bozze riprendibili", async () => {
    const scenario = creaScenario();
    const immobilePersistito = creaImmobile(1);
    const residua = creaBozzaCompleta(
      1,
      new Date("2026-06-01T00:00:00.000Z"),
      immobilePersistito,
    );
    const riprendibile = new BozzaContratto({
      idBozza: 2,
      stepCompletato: 1,
      immobile: creaImmobile(2, 20),
    });
    scenario.immobileRepository.immobili = [
      immobilePersistito,
      riprendibile.immobile as Immobile,
    ];
    scenario.bozzaRepository.bozze = [residua, riprendibile];
    scenario.contrattoRepository.contratti = [
      creaContrattoRegistrato(
        new Date("2026-06-01T00:00:00.000Z"),
        immobilePersistito,
      ),
    ];

    await expect(scenario.service.avvia()).resolves.toEqual([riprendibile]);

    expect(scenario.bozzaRepository.eliminazioni).toEqual([1]);
    expect(scenario.bozzaRepository.bozze).toEqual([riprendibile]);
  });

  test("mantiene una bozza completa quando l'inquilino non coincide", async () => {
    const scenario = creaScenario();
    const immobilePersistito = creaImmobile(1);
    const bozza = creaBozzaCompleta(1, undefined, immobilePersistito);
    scenario.immobileRepository.immobili = [immobilePersistito];
    scenario.bozzaRepository.bozze = [bozza];
    scenario.contrattoRepository.contratti = [
      creaContrattoRegistrato(
        new Date("2026-06-01T00:00:00.000Z"),
        immobilePersistito,
        "BNCLCU90A01H501Z",
      ),
    ];

    await expect(scenario.service.avvia()).resolves.toEqual([bozza]);
    expect(scenario.bozzaRepository.eliminazioni).toEqual([]);
  });

  test("mantiene una bozza incompleta senza interrogare i contratti", async () => {
    const scenario = creaScenario();
    const bozza = new BozzaContratto({
      idBozza: 1,
      stepCompletato: 1,
      immobile: creaImmobile(1),
    });
    scenario.bozzaRepository.bozze = [bozza];

    await expect(scenario.service.avvia()).resolves.toEqual([bozza]);
    expect(scenario.contrattoRepository.ricerchePerImmobile).toBe(0);
  });
});

describe("RegistraContrattoService.conferma", () => {
  test("rifiuta una bozza incompleta senza registrare nulla", async () => {
    const scenario = creaScenario();
    scenario.bozzaRepository.bozze = [
      new BozzaContratto({
        idBozza: 1,
        stepCompletato: 3,
        immobile: creaImmobile(1),
      }),
    ];

    await expect(scenario.service.conferma(1)).rejects.toThrow(
      "Bozza del contratto incompleta",
    );

    expect(scenario.registrazionePort.contrattoRegistrato).toBeNull();
    expect(scenario.bozzaRepository.eliminazioni).toEqual([]);
  });

  test("delega al repository la ricerca efficiente della sovrapposizione usando dal e al memorizzati", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    const bozza = creaBozzaCompleta(
      1,
      new Date("2027-01-01T00:00:00.000Z"),
      immobile,
    );
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozze = [bozza];
    scenario.contrattoRepository.sovrapposizione = true;

    await expect(scenario.service.conferma(1)).rejects.toThrow(
      "Il periodo del contratto si sovrappone a un contratto esistente",
    );

    expect(scenario.contrattoRepository.verificheSovrapposizione).toEqual([
      {
        immobileId: 1,
        dal: new Date("2027-01-01T00:00:00.000Z"),
        al: new Date("2029-12-31T00:00:00.000Z"),
      },
    ]);
    expect(scenario.contrattoRepository.ricerchePerImmobile).toBe(0);
    expect(scenario.registrazionePort.contrattoRegistrato).toBeNull();
  });

  test("registra il contratto con al storico, contenuto e prima mensilità ed elimina solo la bozza confermata", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    const bozza = creaBozzaCompleta(
      1,
      new Date("2026-06-01T00:00:00.000Z"),
      immobile,
    );
    const altraBozza = new BozzaContratto({
      idBozza: 2,
      stepCompletato: 1,
      immobile: creaImmobile(2, 20),
    });
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozze = [bozza, altraBozza];

    await scenario.service.conferma(1);

    const contratto = scenario.registrazionePort.contrattoRegistrato;
    expect(contratto).not.toBeNull();
    expect(contratto?.dal).toEqual(new Date("2026-06-01T00:00:00.000Z"));
    expect(contratto?.al).toEqual(new Date("2029-05-31T00:00:00.000Z"));
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
    expect(scenario.bozzaRepository.eliminazioni).toEqual([1]);
    expect(scenario.bozzaRepository.bozze).toEqual([altraBozza]);
  });

  test("calcola in pro-rata la prima mensilità quando la decorrenza è a mese iniziato", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozze = [
      creaBozzaCompleta(
        1,
        new Date("2026-06-15T00:00:00.000Z"),
        immobile,
      ),
    ];

    await scenario.service.conferma(1);

    expect(
      scenario.registrazionePort.contrattoRegistrato?.pagamenti[0]?.importo,
    ).toBe(533.33);
  });

  test("mantiene la bozza specifica quando la registrazione definitiva fallisce", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    const bozza = creaBozzaCompleta(1, undefined, immobile);
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozze = [bozza];
    scenario.registrazionePort.errore = new Error("registrazione fallita");

    await expect(scenario.service.conferma(1)).rejects.toThrow(
      "registrazione fallita",
    );

    expect(scenario.bozzaRepository.bozze).toEqual([bozza]);
    expect(scenario.bozzaRepository.eliminazioni).toEqual([]);
  });

  test("considera riuscita la conferma anche se il cleanup della bozza specifica fallisce", async () => {
    const scenario = creaScenario();
    const immobile = creaImmobile(1);
    const bozza = creaBozzaCompleta(1, undefined, immobile);
    scenario.immobileRepository.immobili = [immobile];
    scenario.bozzaRepository.bozze = [bozza];
    scenario.bozzaRepository.erroreEliminazioneId = 1;

    await expect(scenario.service.conferma(1)).resolves.toBeUndefined();

    expect(scenario.registrazionePort.contrattoRegistrato).not.toBeNull();
    expect(scenario.bozzaRepository.bozze).toEqual([bozza]);
    expect(scenario.bozzaRepository.eliminazioni).toEqual([1]);
  });
});
