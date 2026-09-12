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
    if (id !== undefined) {
      this.id = id;
    }

    this.nome = nome;
    this.cognome = cognome;
    this.luogoNascita = luogoNascita;
    this.dataNascita = new Date(dataNascita.getTime());
    this.codiceFiscale = codiceFiscale;
    this.residenza = residenza;

    if (documento !== undefined) {
      this.documento = documento;
    }
  }

  aggiornaDatiAnagrafici(
    nome: string,
    cognome: string,
    luogoNascita: string,
    dataNascita: Date,
  ): void {
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
}

export = Persona;
