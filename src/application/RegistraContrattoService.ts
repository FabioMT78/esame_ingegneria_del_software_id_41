import Contratto from "../domain/Contratto";
import DocumentoRiconoscimento from "../domain/DocumentoRiconoscimento";
import type Immobile from "../domain/Immobile";
import Indirizzo from "../domain/Indirizzo";
import Pagamento from "../domain/Pagamento";
import Persona from "../domain/Persona";
import type TipologiaContrattuale from "../domain/TipologiaContrattuale";
import {
  ConflittoApplicativo,
  ErroreValidazione,
  RisorsaNonTrovata,
} from "./errors/ApplicationError";
import BozzaContratto from "./model/BozzaContratto";
import type BozzaContrattoRepository from "./ports/BozzaContrattoRepository";
import type ContrattoRepository from "./ports/ContrattoRepository";
import type DataCorrenteProvider from "./ports/DataCorrenteProvider";
import type GeneratoreDocumentoContratto from "./ports/GeneratoreDocumentoContratto";
import type ImmobileRepository from "./ports/ImmobileRepository";
import type PersonaRepository from "./ports/PersonaRepository";
import type RegistrazioneContrattoPort from "./ports/RegistrazioneContrattoPort";
import type TipologiaContrattualeRepository from "./ports/TipologiaContrattualeRepository";

type RuoloPersona = "proprietario" | "inquilino";

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

  async avvia(): Promise<BozzaContratto[]> {
    const bozze = await this.bozzaRepository.elenca();
    const riprendibili: BozzaContratto[] = [];

    for (const bozza of bozze) {
      if (await this.bozzaCorrispondeAContrattoRegistrato(bozza)) {
        await this.bozzaRepository.elimina(this.richiediIdBozza(bozza));
      } else {
        riprendibili.push(bozza);
      }
    }

    return riprendibili;
  }

  async elencaImmobili(): Promise<Immobile[]> {
    return this.immobileRepository.trovaTutti();
  }

  async elencaTipologie(): Promise<TipologiaContrattuale[]> {
    return this.tipologiaRepository.trovaTutte();
  }

  async selezionaImmobile(
    immobileId: number,
    idBozza?: number,
  ): Promise<BozzaContratto> {
    const immobile = await this.immobileRepository.trovaPerId(immobileId);

    if (immobile === null) {
      throw new RisorsaNonTrovata("Immobile non trovato");
    }

    await this.verificaBozzaImmobileDisponibile(immobileId, idBozza);

    return this.salvaImmobileInBozza(immobile, idBozza);
  }

  async inserisciNuovoImmobile(
    immobile: Immobile,
    idBozza?: number,
  ): Promise<BozzaContratto> {
    const immobileConStessiDatiCatastali =
      await this.immobileRepository.trovaPerDatiCatastali(
        immobile.datiCatastali,
      );

    if (immobileConStessiDatiCatastali !== null) {
      throw new ConflittoApplicativo(
        "Dati catastali già associati a un immobile",
      );
    }

    if (immobile.indirizzo.interno !== undefined) {
      const indirizzoDuplicato =
        await this.immobileRepository.esisteConIndirizzo(
          immobile.indirizzo,
        );

      if (indirizzoDuplicato) {
        throw new ConflittoApplicativo(
          "Indirizzo completo già associato a un immobile",
        );
      }
    }

    return this.salvaImmobileInBozza(immobile, idBozza);
  }

  async cercaPersona(codiceFiscale: string): Promise<Persona | null> {
    const codiceNormalizzato =
      Persona.normalizzaCodiceFiscale(codiceFiscale);
    const persona =
      await this.personaRepository.trovaPerCodiceFiscale(
        codiceNormalizzato,
      );

    if (persona === null) {
      return null;
    }

    return this.creaWorkingCopyPersona(persona);
  }

  async cercaPersonaPerBozza(
    idBozza: number,
    ruolo: RuoloPersona,
    codiceFiscale: string,
  ): Promise<Persona | null> {
    const bozza = await this.recuperaBozza(idBozza);
    const codiceNormalizzato =
      Persona.normalizzaCodiceFiscale(codiceFiscale);

    const personaStessoRuolo =
      ruolo === "proprietario" ? bozza.proprietario : bozza.inquilino;
    const personaRuoloOpposto =
      ruolo === "proprietario" ? bozza.inquilino : bozza.proprietario;

    if (
      personaRuoloOpposto?.codiceFiscale === codiceNormalizzato
    ) {
      throw new ConflittoApplicativo(
        "Proprietario e inquilino devono essere persone distinte",
      );
    }

    if (personaStessoRuolo?.codiceFiscale === codiceNormalizzato) {
      return this.creaWorkingCopyPersona(personaStessoRuolo);
    }

    return this.cercaPersona(codiceNormalizzato);
  }

  async impostaProprietario(
    idBozza: number,
    persona: Persona,
  ): Promise<BozzaContratto> {
    const bozza = await this.recuperaBozza(idBozza);

    if (bozza.immobile === undefined) {
      throw new ErroreValidazione("Step immobile non completato");
    }

    this.validaPersona(persona);

    if (bozza.inquilino?.codiceFiscale === persona.codiceFiscale) {
      throw new ConflittoApplicativo(
        "Proprietario e inquilino devono essere persone distinte",
      );
    }

    bozza.proprietario = persona;
    bozza.stepCompletato = Math.max(bozza.stepCompletato, 2);

    return this.bozzaRepository.salva(bozza);
  }

  async impostaInquilino(
    idBozza: number,
    persona: Persona,
  ): Promise<BozzaContratto> {
    const bozza = await this.recuperaBozza(idBozza);

    if (bozza.proprietario === undefined) {
      throw new ErroreValidazione("Step proprietario non completato");
    }

    this.validaPersona(persona);

    if (bozza.proprietario.codiceFiscale === persona.codiceFiscale) {
      throw new ConflittoApplicativo(
        "Proprietario e inquilino devono essere persone distinte",
      );
    }

    if (persona.documento === undefined) {
      throw new ErroreValidazione(
        "Documento di riconoscimento obbligatorio per l'inquilino",
      );
    }

    persona.documento.validaScadenzaAlla(
      this.dataCorrenteProvider.oggi(),
    );

    bozza.inquilino = persona;
    bozza.stepCompletato = Math.max(bozza.stepCompletato, 3);

    return this.bozzaRepository.salva(bozza);
  }

  async impostaDatiContrattuali(
    idBozza: number,
    nomeDescrizione: string,
    tipologiaId: number,
    dal: Date,
    canoneMensile: number,
    giornoPagamento: number,
  ): Promise<BozzaContratto> {
    const bozza = await this.recuperaBozza(idBozza);

    if (bozza.inquilino === undefined) {
      throw new ErroreValidazione("Step inquilino non completato");
    }

    if (nomeDescrizione.trim().length === 0) {
      throw new ErroreValidazione(
        "Nome o descrizione del contratto obbligatorio",
      );
    }

    Contratto.validaGiornoPagamento(giornoPagamento);

    const tipologia =
      await this.tipologiaRepository.trovaPerIdConArticoli(tipologiaId);

    if (tipologia === null) {
      throw new RisorsaNonTrovata("Tipologia contrattuale non trovata");
    }

    bozza.nomeDescrizione = nomeDescrizione;
    bozza.tipologia = tipologia;
    bozza.dal = new Date(dal.getTime());
    bozza.al = Contratto.calcolaDataFine(dal, tipologia);
    bozza.canoneMensile = canoneMensile;
    bozza.giornoPagamento = giornoPagamento;
    bozza.stepCompletato = Math.max(bozza.stepCompletato, 4);

    return this.bozzaRepository.salva(bozza);
  }

  async conferma(idBozza: number): Promise<void> {
    const bozza = await this.recuperaBozza(idBozza);

    const {
      immobile,
      proprietario,
      inquilino,
      tipologia,
      nomeDescrizione,
      dal,
      al,
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
      al === undefined ||
      canoneMensile === undefined ||
      giornoPagamento === undefined
    ) {
      throw new ErroreValidazione("Bozza del contratto incompleta");
    }

    const oggi = this.dataCorrenteProvider.oggi();
    Persona.validaDataNascita(proprietario.dataNascita, oggi);
    Persona.validaDataNascita(inquilino.dataNascita, oggi);
    inquilino.documento.validaScadenzaAlla(oggi);

    if (proprietario.codiceFiscale === inquilino.codiceFiscale) {
      throw new ConflittoApplicativo(
        "Proprietario e inquilino devono essere persone distinte",
      );
    }

    Contratto.validaGiornoPagamento(giornoPagamento);

    const immobilePersistito =
      await this.trovaImmobilePersistito(immobile);

    if (
      immobilePersistito?.id !== undefined &&
      (await this.contrattoRepository.esisteSovrapposizione(
        immobilePersistito.id,
        dal,
        al,
      ))
    ) {
      throw new ConflittoApplicativo(
        "Il periodo del contratto si sovrappone a un contratto esistente",
      );
    }

    const contratto = new Contratto({
      nomeDescrizione,
      immobile,
      proprietario,
      inquilino,
      tipologia,
      dal,
      al,
      canoneMensile,
      giornoPagamento,
      registratoIl: oggi,
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
      await this.bozzaRepository.elimina(idBozza);
    } catch {
      // La registrazione definitiva è già conclusa.
      // La bozza residua verrà riconosciuta al successivo avvio.
    }
  }

  async annulla(idBozza: number): Promise<void> {
    await this.recuperaBozza(idBozza);
    await this.bozzaRepository.elimina(idBozza);
  }

  private async salvaImmobileInBozza(
    immobile: Immobile,
    idBozza?: number,
  ): Promise<BozzaContratto> {
    let bozza: BozzaContratto;

    if (idBozza === undefined) {
      bozza = new BozzaContratto({
        stepCompletato: 1,
        immobile,
      });
    } else {
      bozza = await this.recuperaBozza(idBozza);
      bozza.immobile = immobile;
      bozza.stepCompletato = Math.max(bozza.stepCompletato, 1);
    }

    return this.bozzaRepository.salva(bozza);
  }

  private async recuperaBozza(idBozza: number): Promise<BozzaContratto> {
    const bozza = await this.bozzaRepository.trovaPerId(idBozza);

    if (bozza === null) {
      throw new RisorsaNonTrovata("Bozza del contratto non disponibile");
    }

    return bozza;
  }

  private validaPersona(persona: Persona): void {
    Persona.validaDataNascita(
      persona.dataNascita,
      this.dataCorrenteProvider.oggi(),
    );
  }

  private async verificaBozzaImmobileDisponibile(
    immobileId: number,
    idBozza?: number,
  ): Promise<void> {
    const bozzaEsistente =
      await this.bozzaRepository.trovaPerImmobileId(immobileId);

    if (
      bozzaEsistente !== null &&
      bozzaEsistente.idBozza !== idBozza
    ) {
      throw new ConflittoApplicativo(
        "Esiste già una bozza per l'immobile selezionato",
      );
    }
  }

  private richiediIdBozza(bozza: BozzaContratto): number {
    if (bozza.idBozza === undefined) {
      throw new Error("Bozza persistita senza identificatore");
    }

    return bozza.idBozza;
  }

  private async bozzaCorrispondeAContrattoRegistrato(
    bozza: BozzaContratto,
  ): Promise<boolean> {
    const { immobile, inquilino, dal, al } = bozza;

    if (
      immobile === undefined ||
      inquilino === undefined ||
      dal === undefined ||
      al === undefined
    ) {
      return false;
    }

    const immobilePersistito =
      await this.trovaImmobilePersistito(immobile);

    if (immobilePersistito?.id === undefined) {
      return false;
    }

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
      ...(persona.iban !== undefined ? { iban: persona.iban } : {}),
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
