import Contratto from "../domain/Contratto";
import DocumentoRiconoscimento from "../domain/DocumentoRiconoscimento";
import type Immobile from "../domain/Immobile";
import Indirizzo from "../domain/Indirizzo";
import Pagamento from "../domain/Pagamento";
import Persona from "../domain/Persona";
import type TipologiaContrattuale from "../domain/TipologiaContrattuale";
import BozzaContratto from "./model/BozzaContratto";
import type BozzaContrattoRepository from "./ports/BozzaContrattoRepository";
import type ContrattoRepository from "./ports/ContrattoRepository";
import type DataCorrenteProvider from "./ports/DataCorrenteProvider";
import type GeneratoreDocumentoContratto from "./ports/GeneratoreDocumentoContratto";
import type ImmobileRepository from "./ports/ImmobileRepository";
import type PersonaRepository from "./ports/PersonaRepository";
import type RegistrazioneContrattoPort from "./ports/RegistrazioneContrattoPort";
import type TipologiaContrattualeRepository from "./ports/TipologiaContrattualeRepository";

class RegistraContrattoService {
  constructor(
    private readonly bozzaRepository: BozzaContrattoRepository,
    private readonly immobileRepository: ImmobileRepository,
    private readonly personaRepository: PersonaRepository,
    private readonly tipologiaRepository: TipologiaContrattualeRepository,
    private readonly contrattoRepository: ContrattoRepository,
    private readonly registrazioneContrattoPort: RegistrazioneContrattoPort,
    private readonly generatoreDocumento: GeneratoreDocumentoContratto,
    private readonly dataCorrenteProvider: DataCorrenteProvider,
  ) {}

  async avvia(): Promise<BozzaContratto | null> {
    const bozza = await this.bozzaRepository.recupera();

    if (bozza === null) {
      return null;
    }

    if (!(await this.bozzaCorrispondeAContrattoRegistrato(bozza))) {
      return bozza;
    }

    await this.bozzaRepository.elimina();
    return null;
  }

  async elencaImmobili(): Promise<Immobile[]> {
    return this.immobileRepository.trovaTutti();
  }

  async elencaTipologie(): Promise<TipologiaContrattuale[]> {
    return this.tipologiaRepository.trovaTutte();
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

  async impostaDatiContrattuali(
    nomeDescrizione: string,
    tipologiaId: number,
    dal: Date,
    canoneMensile: number,
    giornoPagamento: number,
  ): Promise<BozzaContratto> {
    const bozza = await this.bozzaRepository.recupera();

    if (bozza === null || bozza.inquilino === undefined) {
      throw new Error("Step inquilino non completato");
    }

    if (nomeDescrizione.trim().length === 0) {
      throw new Error("Nome o descrizione del contratto obbligatorio");
    }

    Contratto.validaGiornoPagamento(giornoPagamento);

    const tipologia =
      await this.tipologiaRepository.trovaPerIdConArticoli(tipologiaId);

    if (tipologia === null) {
      throw new Error("Tipologia contrattuale non trovata");
    }

    bozza.nomeDescrizione = nomeDescrizione;
    bozza.tipologia = tipologia;
    bozza.dal = new Date(dal.getTime());
    bozza.canoneMensile = canoneMensile;
    bozza.giornoPagamento = giornoPagamento;
    bozza.stepCompletato = Math.max(bozza.stepCompletato, 4);

    await this.bozzaRepository.salva(bozza);

    return bozza;
  }

  async conferma(): Promise<void> {
    const bozza = await this.bozzaRepository.recupera();

    if (bozza === null) {
      throw new Error("Bozza del contratto non disponibile");
    }

    const {
      immobile,
      proprietario,
      inquilino,
      tipologia,
      nomeDescrizione,
      dal,
      canoneMensile,
      giornoPagamento,
    } = bozza;

    if (
      bozza.stepCompletato < 4 ||
      immobile === undefined ||
      proprietario === undefined ||
      inquilino === undefined ||
      inquilino.documento === undefined ||
      tipologia === undefined ||
      nomeDescrizione === undefined ||
      nomeDescrizione.trim().length === 0 ||
      dal === undefined ||
      canoneMensile === undefined ||
      giornoPagamento === undefined
    ) {
      throw new Error("Bozza del contratto incompleta");
    }

    Contratto.validaGiornoPagamento(giornoPagamento);

    const al = Contratto.calcolaDataFine(dal, tipologia);
    const immobilePersistito =
      await this.trovaImmobilePersistito(immobile);

    if (immobilePersistito?.id !== undefined) {
      const contrattiEsistenti =
        await this.contrattoRepository.trovaPerImmobile(
          immobilePersistito.id,
        );

      const sovrapposto = contrattiEsistenti.some((contratto) =>
        Contratto.periodiSiSovrappongono(
          dal,
          al,
          contratto.dal,
          contratto.al,
        ),
      );

      if (sovrapposto) {
        throw new Error(
          "Il periodo del contratto si sovrappone a un contratto esistente",
        );
      }
    }

    const contratto = new Contratto({
      nomeDescrizione,
      immobile,
      proprietario,
      inquilino,
      tipologia,
      dal,
      canoneMensile,
      giornoPagamento,
      registratoIl: this.dataCorrenteProvider.oggi(),
    });

    contratto.impostaContenuto(
      this.generatoreDocumento.genera(contratto),
    );

    const annoCompetenza = dal.getUTCFullYear();
    const meseCompetenza = dal.getUTCMonth() + 1;

    contratto.aggiungiPagamento(
      new Pagamento({
        annoCompetenza,
        meseCompetenza,
        dataPagamento: dal,
        importo: contratto.calcolaImportoCompetenza(
          annoCompetenza,
          meseCompetenza,
        ),
      }),
    );

    await this.registrazioneContrattoPort.registraDefinitivamente(
      contratto,
    );

    try {
      await this.bozzaRepository.elimina();
    } catch {
      // La registrazione definitiva è già conclusa.
      // La bozza residua verrà riconosciuta al successivo avvio.
    }
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

  private async bozzaCorrispondeAContrattoRegistrato(
    bozza: BozzaContratto,
  ): Promise<boolean> {
    const { immobile, inquilino, dal, tipologia } = bozza;

    if (
      immobile === undefined ||
      inquilino === undefined ||
      dal === undefined ||
      tipologia === undefined
    ) {
      return false;
    }

    const immobilePersistito =
      await this.trovaImmobilePersistito(immobile);

    if (immobilePersistito?.id === undefined) {
      return false;
    }

    const al = Contratto.calcolaDataFine(dal, tipologia);
    const contratti =
      await this.contrattoRepository.trovaPerImmobile(
        immobilePersistito.id,
      );

    return contratti.some(
      (contratto) =>
        this.stessiDatiCatastali(
          immobile.datiCatastali,
          contratto.immobile.datiCatastali,
        ) &&
        contratto.inquilino.codiceFiscale ===
          inquilino.codiceFiscale &&
        contratto.dal.getTime() === dal.getTime() &&
        contratto.al.getTime() === al.getTime(),
    );
  }

  private async trovaImmobilePersistito(
    immobile: Immobile,
  ): Promise<Immobile | null> {
    if (immobile.id !== undefined) {
      const trovatoPerId =
        await this.immobileRepository.trovaPerId(immobile.id);

      if (trovatoPerId !== null) {
        return trovatoPerId;
      }
    }

    return this.immobileRepository.trovaPerDatiCatastali(
      immobile.datiCatastali,
    );
  }

  private stessiDatiCatastali(
    primo: Immobile["datiCatastali"],
    secondo: Immobile["datiCatastali"],
  ): boolean {
    return (
      primo.codiceComunale === secondo.codiceComunale &&
      primo.foglio === secondo.foglio &&
      primo.particella === secondo.particella &&
      primo.subalterno === secondo.subalterno
    );
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
