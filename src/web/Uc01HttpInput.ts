import { ErroreValidazione } from "../application/errors/ApplicationError";
import Contratto from "../domain/Contratto";
import DatiCatastali from "../domain/DatiCatastali";
import DocumentoRiconoscimento from "../domain/DocumentoRiconoscimento";
import Immobile from "../domain/Immobile";
import Indirizzo from "../domain/Indirizzo";
import Persona from "../domain/Persona";

type JsonObject = Record<string, unknown>;

type SelezioneImmobileInput = {
  immobileId: number;
  idBozza?: number;
};

type NuovoImmobileInput = {
  immobile: Immobile;
  idBozza?: number;
};

type DatiContrattualiInput = {
  nomeDescrizione: string;
  tipologiaId: number;
  dal: Date;
  canoneMensile: number;
  giornoPagamento: number;
};

function richiediOggetto(valore: unknown, nome: string): JsonObject {
  if (
    typeof valore !== "object" ||
    valore === null ||
    Array.isArray(valore)
  ) {
    throw new ErroreValidazione(`${nome} deve essere un oggetto JSON`);
  }

  return valore as JsonObject;
}

function richiediStringa(
  oggetto: JsonObject,
  campo: string,
  contesto = campo,
): string {
  const valore = oggetto[campo];

  if (typeof valore !== "string" || valore.trim().length === 0) {
    throw new ErroreValidazione(`${contesto} è obbligatorio`);
  }

  return valore;
}

function leggiStringaOpzionale(
  oggetto: JsonObject,
  campo: string,
  contesto = campo,
): string | undefined {
  const valore = oggetto[campo];

  if (valore === undefined || valore === null) {
    return undefined;
  }

  if (typeof valore !== "string") {
    throw new ErroreValidazione(`${contesto} deve essere una stringa`);
  }

  return valore;
}

function richiediNumero(
  oggetto: JsonObject,
  campo: string,
  contesto = campo,
): number {
  const valore = oggetto[campo];

  if (typeof valore !== "number" || !Number.isFinite(valore)) {
    throw new ErroreValidazione(`${contesto} deve essere un numero valido`);
  }

  return valore;
}

function richiediIntero(
  oggetto: JsonObject,
  campo: string,
  contesto = campo,
): number {
  const valore = richiediNumero(oggetto, campo, contesto);

  if (!Number.isInteger(valore)) {
    throw new ErroreValidazione(`${contesto} deve essere un numero intero`);
  }

  return valore;
}

function richiediId(
  oggetto: JsonObject,
  campo: string,
  contesto = campo,
): number {
  const valore = richiediIntero(oggetto, campo, contesto);

  if (valore < 1) {
    throw new ErroreValidazione(`${contesto} deve essere maggiore di zero`);
  }

  return valore;
}

function leggiIdOpzionale(
  oggetto: JsonObject,
  campo: string,
  contesto = campo,
): number | undefined {
  const valore = oggetto[campo];

  if (valore === undefined || valore === null) {
    return undefined;
  }

  if (
    typeof valore !== "number" ||
    !Number.isInteger(valore) ||
    valore < 1
  ) {
    throw new ErroreValidazione(
      `${contesto} deve essere un intero maggiore di zero`,
    );
  }

  return valore;
}

function leggiDataHttp(valore: unknown, contesto: string): Date {
  if (typeof valore !== "string") {
    throw new ErroreValidazione(`${contesto} deve usare il formato YYYY-MM-DD`);
  }

  const corrispondenza = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valore);

  if (corrispondenza === null) {
    throw new ErroreValidazione(`${contesto} deve usare il formato YYYY-MM-DD`);
  }

  const anno = Number(corrispondenza[1]);
  const mese = Number(corrispondenza[2]);
  const giorno = Number(corrispondenza[3]);
  const data = new Date(Date.UTC(anno, mese - 1, giorno));

  if (
    data.getUTCFullYear() !== anno ||
    data.getUTCMonth() !== mese - 1 ||
    data.getUTCDate() !== giorno
  ) {
    throw new ErroreValidazione(`${contesto} non contiene una data valida`);
  }

  return data;
}

function creaIndirizzo(valore: unknown): Indirizzo {
  const dati = richiediOggetto(valore, "indirizzo");
  const id = leggiIdOpzionale(dati, "id", "indirizzo.id");
  const nazione = leggiStringaOpzionale(dati, "nazione", "indirizzo.nazione");
  const cap = leggiStringaOpzionale(dati, "cap", "indirizzo.cap");
  const civico = leggiStringaOpzionale(dati, "civico", "indirizzo.civico");
  const scala = leggiStringaOpzionale(dati, "scala", "indirizzo.scala");
  const interno = leggiStringaOpzionale(dati, "interno", "indirizzo.interno");

  return new Indirizzo({
    ...(id !== undefined ? { id } : {}),
    ...(nazione !== undefined ? { nazione } : {}),
    provincia: richiediStringa(dati, "provincia", "indirizzo.provincia"),
    comune: richiediStringa(dati, "comune", "indirizzo.comune"),
    ...(cap !== undefined ? { cap } : {}),
    indirizzo: richiediStringa(dati, "indirizzo", "indirizzo.indirizzo"),
    ...(civico !== undefined ? { civico } : {}),
    ...(scala !== undefined ? { scala } : {}),
    ...(interno !== undefined ? { interno } : {}),
  });
}

function creaDatiCatastali(valore: unknown): DatiCatastali {
  const dati = richiediOggetto(valore, "datiCatastali");
  const id = leggiIdOpzionale(dati, "id", "datiCatastali.id");

  return new DatiCatastali({
    ...(id !== undefined ? { id } : {}),
    codiceComunale: richiediStringa(
      dati,
      "codiceComunale",
      "datiCatastali.codiceComunale",
    ),
    foglio: richiediIntero(dati, "foglio", "datiCatastali.foglio"),
    particella: richiediIntero(
      dati,
      "particella",
      "datiCatastali.particella",
    ),
    subalterno: richiediIntero(
      dati,
      "subalterno",
      "datiCatastali.subalterno",
    ),
    categoria: richiediStringa(
      dati,
      "categoria",
      "datiCatastali.categoria",
    ),
    consistenza: richiediNumero(
      dati,
      "consistenza",
      "datiCatastali.consistenza",
    ),
    rendita: richiediNumero(dati, "rendita", "datiCatastali.rendita"),
  });
}

function creaImmobile(valore: unknown): Immobile {
  const dati = richiediOggetto(valore, "immobile");

  if (dati.id !== undefined && dati.id !== null) {
    throw new ErroreValidazione(
      "Un nuovo immobile non deve avere un identificatore persistito",
    );
  }

  return new Immobile({
    nome: richiediStringa(dati, "nome", "immobile.nome"),
    indirizzo: creaIndirizzo(dati.indirizzo),
    datiCatastali: creaDatiCatastali(dati.datiCatastali),
  });
}

function creaDocumento(valore: unknown): DocumentoRiconoscimento | undefined {
  if (valore === undefined || valore === null) {
    return undefined;
  }

  const dati = richiediOggetto(valore, "documento");
  const tipo = richiediStringa(dati, "tipo", "documento.tipo");

  if (tipo !== "carta d'identità" && tipo !== "passaporto") {
    throw new ErroreValidazione(
      "documento.tipo deve essere carta d'identità o passaporto",
    );
  }

  const id = leggiIdOpzionale(dati, "id", "documento.id");

  return new DocumentoRiconoscimento({
    ...(id !== undefined ? { id } : {}),
    tipo,
    organoEmittente: richiediStringa(
      dati,
      "organoEmittente",
      "documento.organoEmittente",
    ),
    dataRilascio: leggiDataHttp(
      dati.dataRilascio,
      "documento.dataRilascio",
    ),
    dataScadenza: leggiDataHttp(
      dati.dataScadenza,
      "documento.dataScadenza",
    ),
    numero: richiediStringa(dati, "numero", "documento.numero"),
  });
}

function creaPersona(valore: unknown): Persona {
  const dati = richiediOggetto(valore, "persona");
  const id = leggiIdOpzionale(dati, "id", "persona.id");
  const documento = creaDocumento(dati.documento);
  const iban = leggiStringaOpzionale(dati, "iban", "persona.iban");

  return new Persona({
    ...(id !== undefined ? { id } : {}),
    nome: richiediStringa(dati, "nome", "persona.nome"),
    cognome: richiediStringa(dati, "cognome", "persona.cognome"),
    luogoNascita: richiediStringa(
      dati,
      "luogoNascita",
      "persona.luogoNascita",
    ),
    dataNascita: leggiDataHttp(dati.dataNascita, "persona.dataNascita"),
    codiceFiscale: richiediStringa(
      dati,
      "codiceFiscale",
      "persona.codiceFiscale",
    ),
    residenza: creaIndirizzo(dati.residenza),
    ...(iban !== undefined && iban.trim().length > 0 ? { iban } : {}),
    ...(documento !== undefined ? { documento } : {}),
  });
}

function leggiSelezioneImmobile(valore: unknown): SelezioneImmobileInput {
  const dati = richiediOggetto(valore, "richiesta");
  const idBozza = leggiIdOpzionale(dati, "idBozza");

  return {
    immobileId: richiediId(dati, "immobileId"),
    ...(idBozza !== undefined ? { idBozza } : {}),
  };
}

function leggiNuovoImmobile(valore: unknown): NuovoImmobileInput {
  const dati = richiediOggetto(valore, "richiesta");
  const idBozza = leggiIdOpzionale(dati, "idBozza");

  return {
    immobile: creaImmobile(dati.immobile),
    ...(idBozza !== undefined ? { idBozza } : {}),
  };
}

function leggiPersonaDaBody(valore: unknown): Persona {
  const dati = richiediOggetto(valore, "richiesta");
  return creaPersona(dati.persona);
}

function leggiDatiContrattuali(valore: unknown): DatiContrattualiInput {
  const dati = richiediOggetto(valore, "richiesta");
  const canoneMensile = richiediNumero(dati, "canoneMensile");

  Contratto.validaCanoneMensile(canoneMensile);

  return {
    nomeDescrizione: richiediStringa(dati, "nomeDescrizione"),
    tipologiaId: richiediId(dati, "tipologiaId"),
    dal: leggiDataHttp(dati.dal, "dal"),
    canoneMensile,
    giornoPagamento: richiediIntero(dati, "giornoPagamento"),
  };
}

function leggiIdParametro(valore: string | undefined, nome: string): number {
  if (valore === undefined || !/^\d+$/.test(valore)) {
    throw new ErroreValidazione(`${nome} deve essere un intero maggiore di zero`);
  }

  const id = Number(valore);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ErroreValidazione(`${nome} deve essere un intero maggiore di zero`);
  }

  return id;
}

function leggiStringaParametro(
  valore: string | undefined,
  nome: string,
): string {
  if (valore === undefined || valore.trim().length === 0) {
    throw new ErroreValidazione(`${nome} è obbligatorio`);
  }

  return valore;
}

export {
  leggiDatiContrattuali,
  leggiIdParametro,
  leggiNuovoImmobile,
  leggiPersonaDaBody,
  leggiSelezioneImmobile,
  leggiStringaParametro,
};
export type { DatiContrattualiInput, NuovoImmobileInput, SelezioneImmobileInput };
