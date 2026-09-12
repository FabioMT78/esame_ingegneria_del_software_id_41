import DocumentoRiconoscimento from "../domain/DocumentoRiconoscimento";
import type Immobile from "../domain/Immobile";
import Indirizzo from "../domain/Indirizzo";
import Persona from "../domain/Persona";
import BozzaContratto from "./model/BozzaContratto";
import type BozzaContrattoRepository from "./ports/BozzaContrattoRepository";
import type ImmobileRepository from "./ports/ImmobileRepository";
import type PersonaRepository from "./ports/PersonaRepository";

class RegistraContrattoService {
  constructor(
    private readonly bozzaRepository: BozzaContrattoRepository,
    private readonly immobileRepository: ImmobileRepository,
    private readonly personaRepository: PersonaRepository,
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

    return this.salvaImmobileInBozza(immobile);
  }

  async inserisciNuovoImmobile(immobile: Immobile): Promise<BozzaContratto> {
    const immobileConStessiDatiCatastali =
      await this.immobileRepository.trovaPerDatiCatastali(
        immobile.datiCatastali,
      );

    if (immobileConStessiDatiCatastali !== null) {
      throw new Error("Dati catastali già associati a un immobile");
    }

    if (immobile.indirizzo.interno !== undefined) {
      const indirizzoDuplicato =
        await this.immobileRepository.esisteConIndirizzo(
          immobile.indirizzo,
        );

      if (indirizzoDuplicato) {
        throw new Error("Indirizzo completo già associato a un immobile");
      }
    }

    return this.salvaImmobileInBozza(immobile);
  }

  async cercaPersona(codiceFiscale: string): Promise<Persona | null> {
    const persona =
      await this.personaRepository.trovaPerCodiceFiscale(codiceFiscale);

    if (persona === null) {
      return null;
    }

    return this.creaWorkingCopyPersona(persona);
  }

  async impostaProprietario(persona: Persona): Promise<BozzaContratto> {
    const bozza = await this.bozzaRepository.recupera();

    if (bozza === null || bozza.immobile === undefined) {
      throw new Error("Step immobile non completato");
    }

    bozza.proprietario = persona;
    bozza.stepCompletato = Math.max(bozza.stepCompletato, 2);

    await this.bozzaRepository.salva(bozza);

    return bozza;
  }

  async impostaInquilino(persona: Persona): Promise<BozzaContratto> {
    const bozza = await this.bozzaRepository.recupera();

    if (bozza === null || bozza.proprietario === undefined) {
      throw new Error("Step proprietario non completato");
    }

    if (persona.documento === undefined) {
      throw new Error(
        "Documento di riconoscimento obbligatorio per l'inquilino",
      );
    }

    bozza.inquilino = persona;
    bozza.stepCompletato = Math.max(bozza.stepCompletato, 3);

    await this.bozzaRepository.salva(bozza);

    return bozza;
  }

  async annulla(): Promise<void> {
    await this.bozzaRepository.elimina();
  }

  private async salvaImmobileInBozza(
    immobile: Immobile,
  ): Promise<BozzaContratto> {
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

  private creaWorkingCopyPersona(persona: Persona): Persona {
    const residenza = new Indirizzo({
      provincia: persona.residenza.provincia,
      comune: persona.residenza.comune,
      indirizzo: persona.residenza.indirizzo,
    });

    if (persona.residenza.id !== undefined) {
      residenza.id = persona.residenza.id;
    }
    if (persona.residenza.nazione !== undefined) {
      residenza.nazione = persona.residenza.nazione;
    }
    if (persona.residenza.cap !== undefined) {
      residenza.cap = persona.residenza.cap;
    }
    if (persona.residenza.civico !== undefined) {
      residenza.civico = persona.residenza.civico;
    }
    if (persona.residenza.scala !== undefined) {
      residenza.scala = persona.residenza.scala;
    }
    if (persona.residenza.interno !== undefined) {
      residenza.interno = persona.residenza.interno;
    }

    const workingCopy = new Persona({
      ...(persona.id !== undefined ? { id: persona.id } : {}),
      nome: persona.nome,
      cognome: persona.cognome,
      luogoNascita: persona.luogoNascita,
      dataNascita: persona.dataNascita,
      codiceFiscale: persona.codiceFiscale,
      residenza,
    });

    if (persona.documento !== undefined) {
      const documento = new DocumentoRiconoscimento({
        ...(persona.documento.id !== undefined
          ? { id: persona.documento.id }
          : {}),
        tipo: persona.documento.tipo,
        organoEmittente: persona.documento.organoEmittente,
        dataRilascio: persona.documento.dataRilascio,
        dataScadenza: persona.documento.dataScadenza,
        numero: persona.documento.numero,
      });

      workingCopy.impostaDocumentoRiconoscimento(documento);
    }

    return workingCopy;
  }
}

export = RegistraContrattoService;
