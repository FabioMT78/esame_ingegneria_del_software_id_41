import type PagamentoDaRegistrare from "../application/model/PagamentoDaRegistrare";
import type Immobile from "../domain/Immobile";
import type Pagamento from "../domain/Pagamento";
import type Persona from "../domain/Persona";

function dataToHttpUc02(data: Date): string {
  if (Number.isNaN(data.getTime())) {
    throw new TypeError("Data non valida da serializzare");
  }

  const anno = data.getUTCFullYear().toString().padStart(4, "0");
  const mese = (data.getUTCMonth() + 1).toString().padStart(2, "0");
  const giorno = data.getUTCDate().toString().padStart(2, "0");

  return `${anno}-${mese}-${giorno}`;
}

function richiediIdPersistente(
  id: number | undefined,
  contesto: string,
): number {
  if (id === undefined) {
    throw new Error(`${contesto} registrato privo di identificativo`);
  }

  return id;
}

function serializzaImmobilePagamento(
  immobile: Immobile,
): Record<string, unknown> {
  return {
    id: richiediIdPersistente(immobile.id, "Immobile"),
    nome: immobile.nome,
    indirizzo: {
      provincia: immobile.indirizzo.provincia,
      comune: immobile.indirizzo.comune,
      indirizzo: immobile.indirizzo.indirizzo,
      civico: immobile.indirizzo.civico ?? null,
    },
  };
}

function serializzaInquilinoPagamento(
  persona: Persona,
): Record<string, unknown> {
  return {
    id: richiediIdPersistente(persona.id, "Inquilino"),
    nome: persona.nome,
    cognome: persona.cognome,
    codiceFiscale: persona.codiceFiscale,
  };
}

function serializzaAnteprimaPagamento(
  anteprima: PagamentoDaRegistrare,
): Record<string, unknown> {
  return {
    contrattoId: anteprima.contrattoId,
    canoneMensile: anteprima.canoneMensile,
    tipologiaDenominazione: anteprima.tipologiaDenominazione,
    dal: dataToHttpUc02(anteprima.dal),
    al: dataToHttpUc02(anteprima.al),
    annoCompetenza: anteprima.annoCompetenza,
    meseCompetenza: anteprima.meseCompetenza,
    scadenza: dataToHttpUc02(anteprima.scadenza),
    importo: anteprima.importo,
    dovuta: anteprima.dovuta,
    tardivo: anteprima.tardivo,
  };
}

function serializzaPagamento(pagamento: Pagamento): Record<string, unknown> {
  return {
    id: pagamento.id ?? null,
    annoCompetenza: pagamento.annoCompetenza,
    meseCompetenza: pagamento.meseCompetenza,
    dataPagamento: dataToHttpUc02(pagamento.dataPagamento),
    importo: pagamento.importo,
  };
}

export {
  serializzaAnteprimaPagamento,
  serializzaImmobilePagamento,
  serializzaInquilinoPagamento,
  serializzaPagamento,
};
