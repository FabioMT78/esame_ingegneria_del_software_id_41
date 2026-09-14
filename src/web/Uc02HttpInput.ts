import { ErroreValidazione } from "../application/errors/ApplicationError";

type ConfermaPagamentoInput = {
  contrattoId: number;
  annoCompetenza: number;
  meseCompetenza: number;
};

type SelezioneAnteprimaInput = {
  immobileId: number;
  inquilinoId: number;
};

type JsonObject = Record<string, unknown>;

function leggiInteroPositivo(valore: unknown, nome: string): number {
  if (
    typeof valore !== "number" ||
    !Number.isSafeInteger(valore) ||
    valore < 1
  ) {
    throw new ErroreValidazione(
      `${nome} deve essere un intero maggiore di zero`,
    );
  }

  return valore;
}

function leggiInteroPositivoDaStringa(
  valore: unknown,
  nome: string,
): number {
  if (typeof valore !== "string" || !/^\d+$/.test(valore)) {
    throw new ErroreValidazione(
      `${nome} deve essere un intero maggiore di zero`,
    );
  }

  const numero = Number(valore);

  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw new ErroreValidazione(
      `${nome} deve essere un intero maggiore di zero`,
    );
  }

  return numero;
}

function leggiIdParametroUc02(
  valore: string | undefined,
  nome: string,
): number {
  return leggiInteroPositivoDaStringa(valore, nome);
}

function leggiSelezioneAnteprima(
  immobileId: unknown,
  inquilinoId: unknown,
): SelezioneAnteprimaInput {
  return {
    immobileId: leggiInteroPositivoDaStringa(immobileId, "immobileId"),
    inquilinoId: leggiInteroPositivoDaStringa(inquilinoId, "inquilinoId"),
  };
}

function leggiConfermaPagamento(body: unknown): ConfermaPagamentoInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ErroreValidazione(
      "Il corpo della richiesta deve essere un oggetto JSON",
    );
  }

  const dati = body as JsonObject;
  const meseCompetenza = leggiInteroPositivo(
    dati.meseCompetenza,
    "meseCompetenza",
  );

  if (meseCompetenza > 12) {
    throw new ErroreValidazione(
      "meseCompetenza deve essere compreso tra 1 e 12",
    );
  }

  return {
    contrattoId: leggiInteroPositivo(dati.contrattoId, "contrattoId"),
    annoCompetenza: leggiInteroPositivo(
      dati.annoCompetenza,
      "annoCompetenza",
    ),
    meseCompetenza,
  };
}

export {
  leggiConfermaPagamento,
  leggiIdParametroUc02,
  leggiSelezioneAnteprima,
};
export type { ConfermaPagamentoInput, SelezioneAnteprimaInput };
