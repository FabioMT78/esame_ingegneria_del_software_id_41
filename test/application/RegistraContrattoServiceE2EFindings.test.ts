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

class BozzaRepositoryFake implements BozzaContrattoRepository {
  salvataggi = 0;
  eliminazioni = 0;

  constructor(readonly bozza: BozzaContratto) {}

  async elenca(): Promise<BozzaContratto[]> {
    return [this.bozza];
  }

  async trovaPerId(idBozza: number): Promise<BozzaContratto | null> {
    return idBozza === this.bozza.idBozza ? this.bozza : null;
  }

  async trovaPerImmobileId(
    _immobileId: number,
  ): Promise<BozzaContratto | null> {
    return null;
  }

  async salva(bozza: BozzaContratto): Promise<BozzaContratto> {
    this.salvataggi += 1;
    return bozza;
  }

  async elimina(_idBozza: number): Promise<void> {
    this.eliminazioni += 1;
  }
}

class PersonaRepositoryFake implements PersonaRepository {
  persona: Persona | null = null;

  async trovaPerCodiceFiscale(
    codiceFiscale: string,
  ): Promise<Persona | null> {
    if (this.persona?.codiceFiscale === codiceFiscale) {
      return this.persona;
    }

    return null;
  }
}

class ImmobileRepositoryFake implements ImmobileRepository {
  async trovaTutti(): Promise<Immobile[]> {
    return [];
  }

  async trovaPerId(_id: number): Promise<Immobile | null> {
    return null;
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

class TipologiaRepositoryFake implements TipologiaContrattualeRepository {
  tipologia: TipologiaContrattuale | null = null;

  async trovaTutte(): Promise<TipologiaContrattuale[]> {
    return this.tipologia === null ? [] : [this.tipologia];
  }

  async trovaPerIdConArticoli(
    id: number,
  ): Promise<TipologiaContrattuale | null> {
    return this.tipologia?.id === id ? this.tipologia : null;
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

class RegistrazioneFake implements RegistrazioneContrattoPort {
  chiamate = 0;

  async registraDefinitivamente(_contratto: Contratto): Promise<void> {
    this.chiamate += 1;
  }
}

class GeneratoreFake implements GeneratoreDocumentoContratto {
  chiamate = 0;
  ultimoContratto: Contratto | null = null;

  genera(contratto: Contratto): string {
    this.chiamate += 1;
    this.ultimoContratto = contratto;
    return "<section><article>Anteprima valorizzata</article></section>";
  }
}

class DataCorrenteFake implements DataCorrenteProvider {
  oggi(): Date {
    return new Date("2026-09-14T00:00:00.000Z");
  }
}

function creaIndirizzo(): Indirizzo {
  return new Indirizzo({
    provincia: "RM",
    comune: "Roma",
    indirizzo: "Via Esempio",
  });
}

function creaImmobile(): Immobile {
  return new Immobile({
    nome: "Casa Roma",
    indirizzo: creaIndirizzo(),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 1,
      particella: 2,
      subalterno: 3,
      categoria: "A/2",
      consistenza: 5,
      rendita: 1000,
    }),
  });
}

function creaPersona(
  codiceFiscale: string,
  opzioni: {
    id?: number;
    iban?: string;
    documento?: DocumentoRiconoscimento;
  } = {},
): Persona {
  return new Persona({
    ...(opzioni.id !== undefined ? { id: opzioni.id } : {}),
    nome: "Mario",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-10T00:00:00.000Z"),
    codiceFiscale,
    residenza: creaIndirizzo(),
    ...(opzioni.iban !== undefined ? { iban: opzioni.iban } : {}),
    ...(opzioni.documento !== undefined
      ? { documento: opzioni.documento }
      : {}),
  });
}

function creaDocumento(
  dataRilascio = "2024-01-01T00:00:00.000Z",
): DocumentoRiconoscimento {
  return new DocumentoRiconoscimento({
    tipo: "carta d'identità",
    organoEmittente: "Comune di Roma",
    dataRilascio: new Date(dataRilascio),
    dataScadenza: new Date("2034-01-01T00:00:00.000Z"),
    numero: "CA1234567",
  });
}

function creaTipologia(richiedeIban: boolean): TipologiaContrattuale {
  return new TipologiaContrattuale({
    id: 1,
    denominazione: "Canone concordato",
    durata: 3,
    rinnovo: 2,
    articoli: [
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Canone",
        descrizione: richiedeIban
          ? "Pagamento su {{proprietario.iban}}"
          : "Canone {{contratto.canoneMensile}}",
      }),
    ],
  });
}

function creaScenario(bozza: BozzaContratto): {
  service: RegistraContrattoService;
  bozze: BozzaRepositoryFake;
  persone: PersonaRepositoryFake;
  tipologie: TipologiaRepositoryFake;
  registrazione: RegistrazioneFake;
  generatore: GeneratoreFake;
} {
  const bozze = new BozzaRepositoryFake(bozza);
  const persone = new PersonaRepositoryFake();
  const tipologie = new TipologiaRepositoryFake();
  const registrazione = new RegistrazioneFake();
  const generatore = new GeneratoreFake();

  return {
    service: new RegistraContrattoService(
      bozze,
      new ImmobileRepositoryFake(),
      persone,
      tipologie,
      new ContrattoRepositoryFake(),
      registrazione,
      generatore,
      new DataCorrenteFake(),
    ),
    bozze,
    persone,
    tipologie,
    registrazione,
    generatore,
  };
}

describe("RegistraContrattoService - correzioni emerse dall'E2E", () => {
  test("rifiuta l'inserimento diretto di una persona già registrata", async () => {
    const bozza = new BozzaContratto({
      idBozza: 1,
      stepCompletato: 1,
      immobile: creaImmobile(),
    });
    const scenario = creaScenario(bozza);
    scenario.persone.persona = creaPersona("RSSMRA80A10H501U", { id: 99 });

    await expect(
      scenario.service.impostaProprietario(
        1,
        creaPersona("RSSMRA80A10H501U"),
      ),
    ).rejects.toThrow(
      "Il codice fiscale appartiene a una persona già registrata. Utilizzare la ricerca per recuperarla",
    );

    expect(scenario.bozze.salvataggi).toBe(0);
  });

  test("rifiuta un documento con data di rilascio futura", async () => {
    const bozza = new BozzaContratto({
      idBozza: 1,
      stepCompletato: 2,
      immobile: creaImmobile(),
      proprietario: creaPersona("RSSMRA80A10H501U"),
    });
    const scenario = creaScenario(bozza);

    await expect(
      scenario.service.impostaInquilino(
        1,
        creaPersona("VRDLGI90B20H501X", {
          documento: creaDocumento("2026-09-15T00:00:00.000Z"),
        }),
      ),
    ).rejects.toThrow(
      "La data di rilascio del documento non può essere successiva alla data corrente",
    );

    expect(scenario.bozze.salvataggi).toBe(0);
  });

  test("blocca lo Step 4 se il template richiede un IBAN assente", async () => {
    const bozza = new BozzaContratto({
      idBozza: 1,
      stepCompletato: 3,
      immobile: creaImmobile(),
      proprietario: creaPersona("RSSMRA80A10H501U"),
      inquilino: creaPersona("VRDLGI90B20H501X", {
        documento: creaDocumento(),
      }),
    });
    const scenario = creaScenario(bozza);
    scenario.tipologie.tipologia = creaTipologia(true);

    await expect(
      scenario.service.impostaDatiContrattuali(
        1,
        "Contratto test",
        1,
        new Date("2026-10-01T00:00:00.000Z"),
        900,
        15,
      ),
    ).rejects.toThrow(
      "La tipologia selezionata richiede l'IBAN del proprietario. Compilare il dato nello Step 2",
    );

    expect(scenario.bozze.salvataggi).toBe(0);
  });

  test("genera l'anteprima dal contratto transitorio senza registrare dati definitivi", async () => {
    const tipologia = creaTipologia(true);
    const dal = new Date("2026-10-01T00:00:00.000Z");
    const bozza = new BozzaContratto({
      idBozza: 1,
      stepCompletato: 4,
      immobile: creaImmobile(),
      proprietario: creaPersona("RSSMRA80A10H501U", {
        iban: "IT60X0542811101000000123456",
      }),
      inquilino: creaPersona("VRDLGI90B20H501X", {
        documento: creaDocumento(),
      }),
      tipologia,
      nomeDescrizione: "Contratto test",
      dal,
      al: Contratto.calcolaDataFine(dal, tipologia),
      canoneMensile: 900,
      giornoPagamento: 15,
    });
    const scenario = creaScenario(bozza);

    const html = await scenario.service.anteprima(1);

    expect(html).toContain("Anteprima valorizzata");
    expect(scenario.generatore.chiamate).toBe(1);
    expect(scenario.generatore.ultimoContratto?.nomeDescrizione).toBe(
      "Contratto test",
    );
    expect(scenario.registrazione.chiamate).toBe(0);
    expect(scenario.bozze.eliminazioni).toBe(0);
  });
});
