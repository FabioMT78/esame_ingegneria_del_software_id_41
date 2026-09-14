import type BozzaContratto from "../application/model/BozzaContratto";
import type Articolo from "../domain/Articolo";
import type DatiCatastali from "../domain/DatiCatastali";
import type DocumentoRiconoscimento from "../domain/DocumentoRiconoscimento";
import type Immobile from "../domain/Immobile";
import type Indirizzo from "../domain/Indirizzo";
import type Persona from "../domain/Persona";
import type TipologiaContrattuale from "../domain/TipologiaContrattuale";

function dataToHttp(data: Date): string {
  if (Number.isNaN(data.getTime())) {
    throw new TypeError("Data non valida da serializzare");
  }

  const anno = data.getUTCFullYear().toString().padStart(4, "0");
  const mese = (data.getUTCMonth() + 1).toString().padStart(2, "0");
  const giorno = data.getUTCDate().toString().padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

function serializzaIndirizzo(indirizzo: Indirizzo): Record<string, unknown> {
  return {
    id: indirizzo.id ?? null,
    nazione: indirizzo.nazione ?? null,
    provincia: indirizzo.provincia,
    comune: indirizzo.comune,
    cap: indirizzo.cap ?? null,
    indirizzo: indirizzo.indirizzo,
    civico: indirizzo.civico ?? null,
    scala: indirizzo.scala ?? null,
    interno: indirizzo.interno ?? null,
  };
}

function serializzaDatiCatastali(
  dati: DatiCatastali,
): Record<string, unknown> {
  return {
    id: dati.id ?? null,
    codiceComunale: dati.codiceComunale,
    foglio: dati.foglio,
    particella: dati.particella,
    subalterno: dati.subalterno,
    categoria: dati.categoria,
    consistenza: dati.consistenza,
    rendita: dati.rendita,
  };
}

function serializzaImmobile(immobile: Immobile): Record<string, unknown> {
  return {
    id: immobile.id ?? null,
    nome: immobile.nome,
    indirizzo: serializzaIndirizzo(immobile.indirizzo),
    datiCatastali: serializzaDatiCatastali(immobile.datiCatastali),
  };
}

function serializzaDocumento(
  documento: DocumentoRiconoscimento,
): Record<string, unknown> {
  return {
    id: documento.id ?? null,
    tipo: documento.tipo,
    organoEmittente: documento.organoEmittente,
    dataRilascio: dataToHttp(documento.dataRilascio),
    dataScadenza: dataToHttp(documento.dataScadenza),
    numero: documento.numero,
  };
}

function serializzaPersona(persona: Persona): Record<string, unknown> {
  return {
    id: persona.id ?? null,
    nome: persona.nome,
    cognome: persona.cognome,
    luogoNascita: persona.luogoNascita,
    dataNascita: dataToHttp(persona.dataNascita),
    codiceFiscale: persona.codiceFiscale,
    iban: persona.iban ?? null,
    residenza: serializzaIndirizzo(persona.residenza),
    documento:
      persona.documento === undefined
        ? null
        : serializzaDocumento(persona.documento),
  };
}

function serializzaArticolo(articolo: Articolo): Record<string, unknown> {
  return {
    id: articolo.id ?? null,
    numArticolo: articolo.numArticolo,
    numParte: articolo.numParte,
    titolo: articolo.titolo,
    sottotitolo: articolo.sottotitolo ?? null,
    descrizione: articolo.descrizione,
  };
}

function serializzaTipologia(
  tipologia: TipologiaContrattuale,
): Record<string, unknown> {
  return {
    id: tipologia.id ?? null,
    denominazione: tipologia.denominazione,
    durata: tipologia.durata,
    rinnovo: tipologia.rinnovo,
    articoli: tipologia.articoli.map(serializzaArticolo),
  };
}

function serializzaBozza(bozza: BozzaContratto): Record<string, unknown> {
  return {
    idBozza: bozza.idBozza ?? null,
    stepCompletato: bozza.stepCompletato,
    immobile:
      bozza.immobile === undefined ? null : serializzaImmobile(bozza.immobile),
    proprietario:
      bozza.proprietario === undefined
        ? null
        : serializzaPersona(bozza.proprietario),
    inquilino:
      bozza.inquilino === undefined
        ? null
        : serializzaPersona(bozza.inquilino),
    tipologia:
      bozza.tipologia === undefined
        ? null
        : serializzaTipologia(bozza.tipologia),
    nomeDescrizione: bozza.nomeDescrizione ?? null,
    dal: bozza.dal === undefined ? null : dataToHttp(bozza.dal),
    al: bozza.al === undefined ? null : dataToHttp(bozza.al),
    canoneMensile: bozza.canoneMensile ?? null,
    giornoPagamento: bozza.giornoPagamento ?? null,
  };
}

export {
  serializzaBozza,
  serializzaImmobile,
  serializzaPersona,
  serializzaTipologia,
};
