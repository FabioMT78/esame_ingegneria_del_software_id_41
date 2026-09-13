import type DocumentoRiconoscimento from "./DocumentoRiconoscimento";
import type Indirizzo from "./Indirizzo";

type PersonaParams = {
  id?: number;
  nome: string;
  cognome: string;
  luogoNascita: string;
  dataNascita: Date;
  codiceFiscale: string;
  residenza: Indirizzo;
  documento?: DocumentoRiconoscimento;
};

const CODICE_FISCALE_PATTERN =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

class Persona {
  readonly id?: number;
  nome: string;
  cognome: string;
  luogoNascita: string;
  dataNascita: Date;
  readonly codiceFiscale: string;
  residenza: Indirizzo;
  documento?: DocumentoRiconoscimento;

  constructor({
    id,
    nome,
    cognome,
    luogoNascita,
    dataNascita,
    codiceFiscale,
    residenza,
    documento,
  }: PersonaParams) {
    Persona.validaData(dataNascita, "Data di nascita non valida");

    if (id !== undefined) {
      this.id = id;
    }

    this.nome = nome;
    this.cognome = cognome;
    this.luogoNascita = luogoNascita;
    this.dataNascita = new Date(dataNascita.getTime());
    this.codiceFiscale = Persona.normalizzaCodiceFiscale(codiceFiscale);
    this.residenza = residenza;

    if (documento !== undefined) {
      this.documento = documento;
    }
  }

  static normalizzaCodiceFiscale(codiceFiscale: string): string {
    const normalizzato = codiceFiscale.trim().toUpperCase();

    if (!CODICE_FISCALE_PATTERN.test(normalizzato)) {
      throw new RangeError(
        "Il codice fiscale deve avere 16 caratteri nel formato previsto",
      );
    }

    return normalizzato;
  }

  static validaDataNascita(dataNascita: Date, oggi: Date): void {
    Persona.validaData(dataNascita, "Data di nascita non valida");
    Persona.validaData(oggi, "Data corrente non valida");

    const nascita = Persona.chiaveData(dataNascita);
    const dataMinima = (oggi.getUTCFullYear() - 150) * 10000 +
      (oggi.getUTCMonth() + 1) * 100 +
      oggi.getUTCDate();
    const dataMassima = (oggi.getUTCFullYear() - 18) * 10000 +
      (oggi.getUTCMonth() + 1) * 100 +
      oggi.getUTCDate();

    if (nascita < dataMinima || nascita > dataMassima) {
      throw new RangeError(
        "La data di nascita deve corrispondere a un'età compresa tra 18 e 150 anni",
      );
    }
  }

  aggiornaDatiAnagrafici(
    nome: string,
    cognome: string,
    luogoNascita: string,
    dataNascita: Date,
  ): void {
    Persona.validaData(dataNascita, "Data di nascita non valida");

    this.nome = nome;
    this.cognome = cognome;
    this.luogoNascita = luogoNascita;
    this.dataNascita = new Date(dataNascita.getTime());
  }

  cambiaResidenza(residenza: Indirizzo): void {
    this.residenza = residenza;
  }

  impostaDocumentoRiconoscimento(
    documento: DocumentoRiconoscimento,
  ): void {
    this.documento = documento;
  }

  private static chiaveData(data: Date): number {
    return data.getUTCFullYear() * 10000 +
      (data.getUTCMonth() + 1) * 100 +
      data.getUTCDate();
  }

  private static validaData(data: Date, messaggio: string): void {
    if (Number.isNaN(data.getTime())) {
      throw new RangeError(messaggio);
    }
  }
}

export = Persona;
