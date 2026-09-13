import RegistraContrattoService from "../../src/application/RegistraContrattoService";
import {
  ConflittoApplicativo,
} from "../../src/application/errors/ApplicationError";
import BozzaContratto from "../../src/application/model/BozzaContratto";
import type BozzaContrattoRepository from "../../src/application/ports/BozzaContrattoRepository";
import type ContrattoRepository from "../../src/application/ports/ContrattoRepository";
import type DataCorrenteProvider from "../../src/application/ports/DataCorrenteProvider";
import type GeneratoreDocumentoContratto from "../../src/application/ports/GeneratoreDocumentoContratto";
import type ImmobileRepository from "../../src/application/ports/ImmobileRepository";
import type PersonaRepository from "../../src/application/ports/PersonaRepository";
import type RegistrazioneContrattoPort from "../../src/application/ports/RegistrazioneContrattoPort";
import type TipologiaContrattualeRepository from "../../src/application/ports/TipologiaContrattualeRepository";
import Contratto from "../../src/domain/Contratto";
import DatiCatastali from "../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Persona from "../../src/domain/Persona";
import type TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";

class BozzaContrattoRepositoryFake implements BozzaContrattoRepository {
  salvataggi = 0;

  constructor(private readonly bozza: BozzaContratto) {}

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

  async elimina(_idBozza: number): Promise<void> {}
}

class PersonaRepositoryFake implements PersonaRepository {
  ricerche = 0;

  async trovaPerCodiceFiscale(
    _codiceFiscale: string,
  ): Promise<Persona | null> {
    this.ricerche += 1;
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
    return new Date("2026-09-13T00:00:00.000Z");
  }
}

function creaImmobile(): Immobile {
  return new Immobile({
    id: 1,
    nome: "Casa Roma",
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Esempio",
    }),
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
  dataNascita = "1980-01-10T00:00:00.000Z",
  documento = false,
): Persona {
  const persona = new Persona({
    nome: "Mario",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date(dataNascita),
    codiceFiscale,
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Residenza",
    }),
  });

  if (documento) {
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

function creaService(bozza: BozzaContratto): {
  service: RegistraContrattoService;
  bozzaRepository: BozzaContrattoRepositoryFake;
  personaRepository: PersonaRepositoryFake;
} {
  const bozzaRepository = new BozzaContrattoRepositoryFake(bozza);
  const personaRepository = new PersonaRepositoryFake();

  const service = new RegistraContrattoService(
    bozzaRepository,
    new ImmobileRepositoryFake(),
    personaRepository,
    new TipologiaContrattualeRepositoryFake(),
    new ContrattoRepositoryFake(),
    new RegistrazioneContrattoPortFake(),
    new GeneratoreDocumentoContrattoFake(),
    new DataCorrenteProviderFake(),
  );

  return { service, bozzaRepository, personaRepository };
}

describe("RegistraContrattoService - persone nella bozza", () => {
  test("trova il proprietario non ancora definitivo nella bozza corrente", async () => {
    const proprietario = creaPersona("RSSMRA80A10H501U");
    const bozza = new BozzaContratto({
      idBozza: 7,
      stepCompletato: 2,
      immobile: creaImmobile(),
      proprietario,
    });
    const { service, personaRepository } = creaService(bozza);

    const trovato = await service.cercaPersonaPerBozza(
      7,
      "proprietario",
      " rssmra80a10h501u ",
    );

    expect(trovato).not.toBeNull();
    expect(trovato).not.toBe(proprietario);
    expect(trovato?.codiceFiscale).toBe("RSSMRA80A10H501U");
    expect(personaRepository.ricerche).toBe(0);
  });

  test("rifiuta la ricerca dell'inquilino con il CF del proprietario della stessa bozza", async () => {
    const proprietario = creaPersona("RSSMRA80A10H501U");
    const bozza = new BozzaContratto({
      idBozza: 7,
      stepCompletato: 2,
      immobile: creaImmobile(),
      proprietario,
    });
    const { service } = creaService(bozza);

    await expect(
      service.cercaPersonaPerBozza(
        7,
        "inquilino",
        "RSSMRA80A10H501U",
      ),
    ).rejects.toBeInstanceOf(ConflittoApplicativo);
  });

  test("rifiuta anche il salvataggio diretto dello stesso CF nei due ruoli", async () => {
    const proprietario = creaPersona("RSSMRA80A10H501U");
    const bozza = new BozzaContratto({
      idBozza: 7,
      stepCompletato: 2,
      immobile: creaImmobile(),
      proprietario,
    });
    const { service, bozzaRepository } = creaService(bozza);
    const inquilino = creaPersona(
      "RSSMRA80A10H501U",
      "1980-01-10T00:00:00.000Z",
      true,
    );

    await expect(
      service.impostaInquilino(7, inquilino),
    ).rejects.toThrow(
      "Proprietario e inquilino devono essere persone distinte",
    );

    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("rifiuta un inquilino con documento scaduto alla data corrente", async () => {
    const proprietario = creaPersona("RSSMRA80A10H501U");
    const bozza = new BozzaContratto({
      idBozza: 7,
      stepCompletato: 2,
      immobile: creaImmobile(),
      proprietario,
    });
    const { service, bozzaRepository } = creaService(bozza);
    const inquilino = creaPersona(
      "VRDLGI90B20H501X",
      "1980-01-10T00:00:00.000Z",
      true,
    );

    if (inquilino.documento === undefined) {
      throw new Error("Documento di test non disponibile");
    }

    inquilino.documento.dataScadenza =
      new Date("2026-09-13T00:00:00.000Z");

    await expect(
      service.impostaInquilino(7, inquilino),
    ).rejects.toThrow(
      "La data di scadenza del documento deve essere successiva alla data corrente",
    );

    expect(bozzaRepository.salvataggi).toBe(0);
  });

  test("rifiuta una persona che non ha ancora compiuto 18 anni", async () => {
    const bozza = new BozzaContratto({
      idBozza: 7,
      stepCompletato: 1,
      immobile: creaImmobile(),
    });
    const { service, bozzaRepository } = creaService(bozza);
    const minorenne = creaPersona(
      "RSSMRA80A10H501U",
      "2008-09-14T00:00:00.000Z",
    );

    await expect(
      service.impostaProprietario(7, minorenne),
    ).rejects.toThrow(
      "La data di nascita deve corrispondere a un'età compresa tra 18 e 150 anni",
    );

    expect(bozzaRepository.salvataggi).toBe(0);
  });
});
