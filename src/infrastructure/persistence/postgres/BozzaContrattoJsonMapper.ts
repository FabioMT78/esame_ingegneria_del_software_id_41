import BozzaContratto from "../../../application/model/BozzaContratto";
import Articolo from "../../../domain/Articolo";
import DatiCatastali from "../../../domain/DatiCatastali";
import DocumentoRiconoscimento from "../../../domain/DocumentoRiconoscimento";
import Immobile from "../../../domain/Immobile";
import Indirizzo from "../../../domain/Indirizzo";
import Persona from "../../../domain/Persona";
import TipologiaContrattuale from "../../../domain/TipologiaContrattuale";
import { dataFromSql, dataToSql } from "./PostgresValueMapper";

type JsonRecord = Record<string, unknown>;

type TipoDocumento = "carta d'identità" | "passaporto";

function comeOggetto(valore: unknown, nome: string): JsonRecord {
  if (typeof valore !== "object" || valore === null || Array.isArray(valore)) {
    throw new TypeError(`JSON della bozza non valido: ${nome}`);
  }

  return valore as JsonRecord;
}

function richiediStringa(oggetto: JsonRecord, campo: string): string {
  const valore = oggetto[campo];

  if (typeof valore !== "string") {
    throw new TypeError(`JSON della bozza non valido: ${campo}`);
  }

  return valore;
}

function stringaOpzionale(
  oggetto: JsonRecord,
  campo: string,
): string | undefined {
  const valore = oggetto[campo];

  if (valore === undefined) {
    return undefined;
  }

  if (typeof valore !== "string") {
    throw new TypeError(`JSON della bozza non valido: ${campo}`);
  }

  return valore;
}

function richiediNumero(oggetto: JsonRecord, campo: string): number {
  const valore = oggetto[campo];

  if (typeof valore !== "number" || !Number.isFinite(valore)) {
    throw new TypeError(`JSON della bozza non valido: ${campo}`);
  }

  return valore;
}

function numeroOpzionale(
  oggetto: JsonRecord,
  campo: string,
): number | undefined {
  const valore = oggetto[campo];

  if (valore === undefined) {
    return undefined;
  }

  if (typeof valore !== "number" || !Number.isFinite(valore)) {
    throw new TypeError(`JSON della bozza non valido: ${campo}`);
  }

  return valore;
}

function arrayObbligatorio(oggetto: JsonRecord, campo: string): unknown[] {
  const valore = oggetto[campo];

  if (!Array.isArray(valore)) {
    throw new TypeError(`JSON della bozza non valido: ${campo}`);
  }

  return valore;
}

function tipoDocumentoDaJson(valore: string): TipoDocumento {
  if (valore !== "carta d'identità" && valore !== "passaporto") {
    throw new TypeError("JSON della bozza non valido: tipo documento");
  }

  return valore;
}

function serializzaIndirizzo(indirizzo: Indirizzo): JsonRecord {
  const risultato: JsonRecord = {
    provincia: indirizzo.provincia,
    comune: indirizzo.comune,
    indirizzo: indirizzo.indirizzo,
  };

  if (indirizzo.id !== undefined) risultato.id = indirizzo.id;
  if (indirizzo.nazione !== undefined) risultato.nazione = indirizzo.nazione;
  if (indirizzo.cap !== undefined) risultato.cap = indirizzo.cap;
  if (indirizzo.civico !== undefined) risultato.civico = indirizzo.civico;
  if (indirizzo.scala !== undefined) risultato.scala = indirizzo.scala;
  if (indirizzo.interno !== undefined) risultato.interno = indirizzo.interno;

  return risultato;
}

function deserializzaIndirizzo(valore: unknown): Indirizzo {
  const dati = comeOggetto(valore, "indirizzo");
  const id = numeroOpzionale(dati, "id");
  const nazione = stringaOpzionale(dati, "nazione");
  const cap = stringaOpzionale(dati, "cap");
  const civico = stringaOpzionale(dati, "civico");
  const scala = stringaOpzionale(dati, "scala");
  const interno = stringaOpzionale(dati, "interno");

  return new Indirizzo({
    ...(id !== undefined ? { id } : {}),
    ...(nazione !== undefined ? { nazione } : {}),
    provincia: richiediStringa(dati, "provincia"),
    comune: richiediStringa(dati, "comune"),
    ...(cap !== undefined ? { cap } : {}),
    indirizzo: richiediStringa(dati, "indirizzo"),
    ...(civico !== undefined ? { civico } : {}),
    ...(scala !== undefined ? { scala } : {}),
    ...(interno !== undefined ? { interno } : {}),
  });
}

function serializzaDatiCatastali(dati: DatiCatastali): JsonRecord {
  const risultato: JsonRecord = {
    codiceComunale: dati.codiceComunale,
    foglio: dati.foglio,
    particella: dati.particella,
    subalterno: dati.subalterno,
    categoria: dati.categoria,
    consistenza: dati.consistenza,
    rendita: dati.rendita,
  };

  if (dati.id !== undefined) risultato.id = dati.id;

  return risultato;
}

function deserializzaDatiCatastali(valore: unknown): DatiCatastali {
  const dati = comeOggetto(valore, "dati catastali");
  const id = numeroOpzionale(dati, "id");

  return new DatiCatastali({
    ...(id !== undefined ? { id } : {}),
    codiceComunale: richiediStringa(dati, "codiceComunale"),
    foglio: richiediNumero(dati, "foglio"),
    particella: richiediNumero(dati, "particella"),
    subalterno: richiediNumero(dati, "subalterno"),
    categoria: richiediStringa(dati, "categoria"),
    consistenza: richiediNumero(dati, "consistenza"),
    rendita: richiediNumero(dati, "rendita"),
  });
}

function serializzaImmobile(immobile: Immobile): JsonRecord {
  const risultato: JsonRecord = {
    nome: immobile.nome,
    indirizzo: serializzaIndirizzo(immobile.indirizzo),
    datiCatastali: serializzaDatiCatastali(immobile.datiCatastali),
  };

  if (immobile.id !== undefined) risultato.id = immobile.id;

  return risultato;
}

function deserializzaImmobile(valore: unknown): Immobile {
  const dati = comeOggetto(valore, "immobile");
  const id = numeroOpzionale(dati, "id");

  return new Immobile({
    ...(id !== undefined ? { id } : {}),
    nome: richiediStringa(dati, "nome"),
    indirizzo: deserializzaIndirizzo(dati.indirizzo),
    datiCatastali: deserializzaDatiCatastali(dati.datiCatastali),
  });
}

function serializzaDocumento(
  documento: DocumentoRiconoscimento,
): JsonRecord {
  const risultato: JsonRecord = {
    tipo: documento.tipo,
    organoEmittente: documento.organoEmittente,
    dataRilascio: dataToSql(documento.dataRilascio),
    dataScadenza: dataToSql(documento.dataScadenza),
    numero: documento.numero,
  };

  if (documento.id !== undefined) risultato.id = documento.id;

  return risultato;
}

function deserializzaDocumento(valore: unknown): DocumentoRiconoscimento {
  const dati = comeOggetto(valore, "documento");
  const id = numeroOpzionale(dati, "id");

  return new DocumentoRiconoscimento({
    ...(id !== undefined ? { id } : {}),
    tipo: tipoDocumentoDaJson(richiediStringa(dati, "tipo")),
    organoEmittente: richiediStringa(dati, "organoEmittente"),
    dataRilascio: dataFromSql(richiediStringa(dati, "dataRilascio")),
    dataScadenza: dataFromSql(richiediStringa(dati, "dataScadenza")),
    numero: richiediStringa(dati, "numero"),
  });
}

function serializzaPersona(persona: Persona): JsonRecord {
  const risultato: JsonRecord = {
    nome: persona.nome,
    cognome: persona.cognome,
    luogoNascita: persona.luogoNascita,
    dataNascita: dataToSql(persona.dataNascita),
    codiceFiscale: persona.codiceFiscale,
    residenza: serializzaIndirizzo(persona.residenza),
  };

  if (persona.id !== undefined) risultato.id = persona.id;
  if (persona.documento !== undefined) {
    risultato.documento = serializzaDocumento(persona.documento);
  }

  return risultato;
}

function deserializzaPersona(valore: unknown): Persona {
  const dati = comeOggetto(valore, "persona");
  const id = numeroOpzionale(dati, "id");
  const documento =
    dati.documento === undefined
      ? undefined
      : deserializzaDocumento(dati.documento);

  return new Persona({
    ...(id !== undefined ? { id } : {}),
    nome: richiediStringa(dati, "nome"),
    cognome: richiediStringa(dati, "cognome"),
    luogoNascita: richiediStringa(dati, "luogoNascita"),
    dataNascita: dataFromSql(richiediStringa(dati, "dataNascita")),
    codiceFiscale: richiediStringa(dati, "codiceFiscale"),
    residenza: deserializzaIndirizzo(dati.residenza),
    ...(documento !== undefined ? { documento } : {}),
  });
}

function serializzaArticolo(articolo: Articolo): JsonRecord {
  const risultato: JsonRecord = {
    numArticolo: articolo.numArticolo,
    numParte: articolo.numParte,
    titolo: articolo.titolo,
    descrizione: articolo.descrizione,
  };

  if (articolo.id !== undefined) risultato.id = articolo.id;
  if (articolo.sottotitolo !== undefined) {
    risultato.sottotitolo = articolo.sottotitolo;
  }

  return risultato;
}

function deserializzaArticolo(valore: unknown): Articolo {
  const dati = comeOggetto(valore, "articolo");
  const id = numeroOpzionale(dati, "id");
  const sottotitolo = stringaOpzionale(dati, "sottotitolo");

  return new Articolo({
    ...(id !== undefined ? { id } : {}),
    numArticolo: richiediNumero(dati, "numArticolo"),
    numParte: richiediNumero(dati, "numParte"),
    titolo: richiediStringa(dati, "titolo"),
    ...(sottotitolo !== undefined ? { sottotitolo } : {}),
    descrizione: richiediStringa(dati, "descrizione"),
  });
}

function serializzaTipologia(
  tipologia: TipologiaContrattuale,
): JsonRecord {
  const risultato: JsonRecord = {
    denominazione: tipologia.denominazione,
    durata: tipologia.durata,
    rinnovo: tipologia.rinnovo,
    articoli: tipologia.articoli.map(serializzaArticolo),
  };

  if (tipologia.id !== undefined) risultato.id = tipologia.id;

  return risultato;
}

function deserializzaTipologia(valore: unknown): TipologiaContrattuale {
  const dati = comeOggetto(valore, "tipologia");
  const id = numeroOpzionale(dati, "id");

  return new TipologiaContrattuale({
    ...(id !== undefined ? { id } : {}),
    denominazione: richiediStringa(dati, "denominazione"),
    durata: richiediNumero(dati, "durata"),
    rinnovo: richiediNumero(dati, "rinnovo"),
    articoli: arrayObbligatorio(dati, "articoli").map(
      deserializzaArticolo,
    ),
  });
}

class BozzaContrattoJsonMapper {
  static serializza(bozza: BozzaContratto): JsonRecord {
    const risultato: JsonRecord = {
      stepCompletato: bozza.stepCompletato,
    };

    if (bozza.immobile !== undefined) {
      risultato.immobile = serializzaImmobile(bozza.immobile);
    }
    if (bozza.proprietario !== undefined) {
      risultato.proprietario = serializzaPersona(bozza.proprietario);
    }
    if (bozza.inquilino !== undefined) {
      risultato.inquilino = serializzaPersona(bozza.inquilino);
    }
    if (bozza.tipologia !== undefined) {
      risultato.tipologia = serializzaTipologia(bozza.tipologia);
    }
    if (bozza.nomeDescrizione !== undefined) {
      risultato.nomeDescrizione = bozza.nomeDescrizione;
    }
    if (bozza.dal !== undefined) risultato.dal = dataToSql(bozza.dal);
    if (bozza.al !== undefined) risultato.al = dataToSql(bozza.al);
    if (bozza.canoneMensile !== undefined) {
      risultato.canoneMensile = bozza.canoneMensile;
    }
    if (bozza.giornoPagamento !== undefined) {
      risultato.giornoPagamento = bozza.giornoPagamento;
    }

    return risultato;
  }

  static deserializza(idBozza: number, valore: unknown): BozzaContratto {
    const dati = comeOggetto(valore, "bozza");
    const nomeDescrizione = stringaOpzionale(dati, "nomeDescrizione");
    const dal = stringaOpzionale(dati, "dal");
    const al = stringaOpzionale(dati, "al");
    const canoneMensile = numeroOpzionale(dati, "canoneMensile");
    const giornoPagamento = numeroOpzionale(dati, "giornoPagamento");

    return new BozzaContratto({
      idBozza,
      stepCompletato: richiediNumero(dati, "stepCompletato"),
      ...(dati.immobile !== undefined
        ? { immobile: deserializzaImmobile(dati.immobile) }
        : {}),
      ...(dati.proprietario !== undefined
        ? { proprietario: deserializzaPersona(dati.proprietario) }
        : {}),
      ...(dati.inquilino !== undefined
        ? { inquilino: deserializzaPersona(dati.inquilino) }
        : {}),
      ...(dati.tipologia !== undefined
        ? { tipologia: deserializzaTipologia(dati.tipologia) }
        : {}),
      ...(nomeDescrizione !== undefined ? { nomeDescrizione } : {}),
      ...(dal !== undefined ? { dal: dataFromSql(dal) } : {}),
      ...(al !== undefined ? { al: dataFromSql(al) } : {}),
      ...(canoneMensile !== undefined ? { canoneMensile } : {}),
      ...(giornoPagamento !== undefined ? { giornoPagamento } : {}),
    });
  }
}

export = BozzaContrattoJsonMapper;
