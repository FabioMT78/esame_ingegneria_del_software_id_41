const UNITA = [
  "",
  "uno",
  "due",
  "tre",
  "quattro",
  "cinque",
  "sei",
  "sette",
  "otto",
  "nove",
] as const;

const DIECI_DICIANNOVE = [
  "dieci",
  "undici",
  "dodici",
  "tredici",
  "quattordici",
  "quindici",
  "sedici",
  "diciassette",
  "diciotto",
  "diciannove",
] as const;

const DECINE = [
  "",
  "",
  "venti",
  "trenta",
  "quaranta",
  "cinquanta",
  "sessanta",
  "settanta",
  "ottanta",
  "novanta",
] as const;

function sottoCento(numero: number): string {
  if (numero < 10) {
    return UNITA[numero] ?? "";
  }

  if (numero < 20) {
    return DIECI_DICIANNOVE[numero - 10] ?? "";
  }

  const decina = Math.floor(numero / 10);
  const unita = numero % 10;
  let prefisso: string = DECINE[decina] ?? "";

  if (unita === 1 || unita === 8) {
    prefisso = prefisso.slice(0, -1);
  }

  return `${prefisso}${UNITA[unita] ?? ""}`;
}

function sottoMille(numero: number): string {
  const centinaia = Math.floor(numero / 100);
  const resto = numero % 100;
  let risultato = "";

  if (centinaia === 1) {
    risultato = "cento";
  } else if (centinaia > 1) {
    risultato = `${UNITA[centinaia]}cento`;
  }

  if (
    centinaia > 0 &&
    (resto === 8 || (resto >= 80 && resto < 90))
  ) {
    risultato = risultato.slice(0, -1);
  }

  return `${risultato}${sottoCento(resto)}`;
}

function interoInLettere(numero: number): string {
  if (numero === 0) {
    return "zero";
  }

  if (!Number.isSafeInteger(numero) || numero < 0 || numero > 999_999_999) {
    throw new RangeError("Importo fuori dall'intervallo supportato");
  }

  const milioni = Math.floor(numero / 1_000_000);
  const migliaia = Math.floor((numero % 1_000_000) / 1_000);
  const resto = numero % 1_000;
  let parteMilioni = "";

  if (milioni === 1) {
    parteMilioni = "un milione";
  } else if (milioni > 1) {
    parteMilioni = `${sottoMille(milioni)} milioni`;
  }

  let parteInferiore = "";

  if (migliaia === 1) {
    parteInferiore = "mille";
  } else if (migliaia > 1) {
    parteInferiore = `${sottoMille(migliaia)}mila`;
  }

  if (resto > 0) {
    parteInferiore += sottoMille(resto);
  }

  if (parteMilioni !== "" && parteInferiore !== "") {
    return `${parteMilioni} ${parteInferiore}`;
  }

  return parteMilioni || parteInferiore;
}

function importoInLettere(importo: number): string {
  if (!Number.isFinite(importo) || importo < 0) {
    throw new RangeError("Importo non valido");
  }

  const centesimiTotali = Math.round(importo * 100);
  const euro = Math.floor(centesimiTotali / 100);
  const centesimi = centesimiTotali % 100;

  return `${interoInLettere(euro)}/${centesimi.toString().padStart(2, "0")}`;
}

export { importoInLettere, interoInLettere };
