import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type PostgresExecutor from "./PostgresExecutor";

type JsonObject = Record<string, unknown>;

type ArticoloSeed = {
  numArticolo: number;
  numParte: number;
  titolo: string;
  sottotitolo?: string;
  descrizione: string;
};

type TipologiaSeed = {
  denominazione: string;
  durata: number;
  rinnovo: number;
  articoli: ArticoloSeed[];
};

type EsitoSeedTemplate = {
  tipologie: number;
  articoli: number;
};

function richiediOggetto(valore: unknown, contesto: string): JsonObject {
  if (
    typeof valore !== "object" ||
    valore === null ||
    Array.isArray(valore)
  ) {
    throw new TypeError(`Template non valido: ${contesto}`);
  }

  return valore as JsonObject;
}

function richiediStringa(
  oggetto: JsonObject,
  campo: string,
  contesto: string,
): string {
  const valore = oggetto[campo];

  if (typeof valore !== "string" || valore.trim().length === 0) {
    throw new TypeError(`Template non valido: ${contesto}.${campo}`);
  }

  return valore;
}

function stringaOpzionale(
  oggetto: JsonObject,
  campo: string,
  contesto: string,
): string | undefined {
  const valore = oggetto[campo];

  if (valore === undefined) {
    return undefined;
  }

  if (typeof valore !== "string") {
    throw new TypeError(`Template non valido: ${contesto}.${campo}`);
  }

  return valore;
}

function richiediIntero(
  oggetto: JsonObject,
  campo: string,
  contesto: string,
  minimo: number,
): number {
  const valore = oggetto[campo];

  if (
    typeof valore !== "number" ||
    !Number.isInteger(valore) ||
    valore < minimo
  ) {
    throw new TypeError(`Template non valido: ${contesto}.${campo}`);
  }

  return valore;
}

function leggiArticolo(
  valore: unknown,
  contesto: string,
): ArticoloSeed {
  const dati = richiediOggetto(valore, contesto);
  const sottotitolo = stringaOpzionale(dati, "sottotitolo", contesto);

  return {
    numArticolo: richiediIntero(dati, "numArticolo", contesto, 1),
    numParte: richiediIntero(dati, "numParte", contesto, 0),
    titolo: richiediStringa(dati, "titolo", contesto),
    ...(sottotitolo !== undefined ? { sottotitolo } : {}),
    descrizione: richiediStringa(dati, "descrizione", contesto),
  };
}

function leggiTipologia(
  valore: unknown,
  nomeFile: string,
): TipologiaSeed {
  const dati = richiediOggetto(valore, nomeFile);
  const articoliRaw = dati.articoli;

  if (!Array.isArray(articoliRaw) || articoliRaw.length === 0) {
    throw new TypeError(`Template non valido: ${nomeFile}.articoli`);
  }

  const articoli = articoliRaw.map((articolo, indice) =>
    leggiArticolo(articolo, `${nomeFile}.articoli[${indice}]`),
  );

  const chiavi = new Set<string>();

  for (const articolo of articoli) {
    const chiave = `${articolo.numArticolo}:${articolo.numParte}`;

    if (chiavi.has(chiave)) {
      throw new TypeError(
        `Template non valido: parte articolo duplicata ${chiave} in ${nomeFile}`,
      );
    }

    chiavi.add(chiave);
  }

  return {
    denominazione: richiediStringa(dati, "denominazione", nomeFile),
    durata: richiediIntero(dati, "durata", nomeFile, 1),
    rinnovo: richiediIntero(dati, "rinnovo", nomeFile, 1),
    articoli,
  };
}

async function leggiTemplateDaDirectory(
  directory: string,
): Promise<TipologiaSeed[]> {
  const nomiFile = (await readdir(directory))
    .filter((nomeFile) => nomeFile.endsWith(".json"))
    .sort();

  if (nomiFile.length === 0) {
    throw new Error(`Nessun template JSON trovato in ${directory}`);
  }

  const tipologie: TipologiaSeed[] = [];
  const denominazioni = new Set<string>();

  for (const nomeFile of nomiFile) {
    const contenuto = await readFile(
      path.join(directory, nomeFile),
      "utf8",
    );
    const valore: unknown = JSON.parse(contenuto);
    const tipologia = leggiTipologia(valore, nomeFile);

    if (denominazioni.has(tipologia.denominazione)) {
      throw new TypeError(
        `Template non valido: denominazione duplicata ${tipologia.denominazione}`,
      );
    }

    denominazioni.add(tipologia.denominazione);
    tipologie.push(tipologia);
  }

  return tipologie;
}

async function caricaTemplateContrattuali(
  db: PostgresExecutor,
  directory = path.resolve(process.cwd(), "db/seed/template"),
): Promise<EsitoSeedTemplate> {
  const tipologie = await leggiTemplateDaDirectory(directory);
  let articoliCaricati = 0;
  let transazioneAvviata = false;

  try {
    await db.query("BEGIN");
    transazioneAvviata = true;

    for (const tipologia of tipologie) {
      const risultatoTipologia = await db.query<{ id: number }>(
        `
          INSERT INTO tipologia_contrattuale (
            denominazione,
            durata,
            rinnovo
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (denominazione)
          DO UPDATE SET
            durata = EXCLUDED.durata,
            rinnovo = EXCLUDED.rinnovo
          RETURNING id
        `,
        [
          tipologia.denominazione,
          tipologia.durata,
          tipologia.rinnovo,
        ],
      );

      const tipologiaId = risultatoTipologia.rows[0]?.id;

      if (tipologiaId === undefined) {
        throw new Error(
          `Impossibile persistere la tipologia ${tipologia.denominazione}`,
        );
      }

      await db.query(
        `
          DELETE FROM articolo
          WHERE tipologia_id = $1
        `,
        [tipologiaId],
      );

      for (const articolo of tipologia.articoli) {
        await db.query(
          `
            INSERT INTO articolo (
              tipologia_id,
              num_articolo,
              num_parte,
              titolo,
              sottotitolo,
              descrizione
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            tipologiaId,
            articolo.numArticolo,
            articolo.numParte,
            articolo.titolo,
            articolo.sottotitolo ?? null,
            articolo.descrizione,
          ],
        );
        articoliCaricati += 1;
      }
    }

    await db.query("COMMIT");
    transazioneAvviata = false;

    return {
      tipologie: tipologie.length,
      articoli: articoliCaricati,
    };
  } catch (errore) {
    if (transazioneAvviata) {
      await db.query("ROLLBACK");
    }

    throw errore;
  }
}

export { caricaTemplateContrattuali };
export type { EsitoSeedTemplate };
