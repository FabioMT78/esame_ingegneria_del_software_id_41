import type DatiCatastali from "../../../domain/DatiCatastali";
import DatiCatastaliEntity from "../../../domain/DatiCatastali";
import Immobile from "../../../domain/Immobile";
import type Indirizzo from "../../../domain/Indirizzo";
import IndirizzoEntity from "../../../domain/Indirizzo";
import type ImmobileRepository from "../../../application/ports/ImmobileRepository";
import type PostgresExecutor from "./PostgresExecutor";
import { numericFromSql } from "./PostgresValueMapper";

type ImmobileRow = {
  immobile_id: number;
  nome: string;
  indirizzo_id: number;
  nazione: string | null;
  provincia: string;
  comune: string;
  cap: string | null;
  indirizzo: string;
  civico: string | null;
  scala: string | null;
  interno: string | null;
  dati_catastali_id: number;
  codice_comunale: string;
  foglio: number;
  particella: number;
  subalterno: number;
  categoria: string;
  consistenza: string | number;
  rendita: string | number;
};

const SELECT_IMMOBILE = `
  SELECT
    i.id AS immobile_id,
    i.nome,
    ind.id AS indirizzo_id,
    ind.nazione,
    ind.provincia,
    ind.comune,
    ind.cap,
    ind.indirizzo,
    ind.civico,
    ind.scala,
    ind.interno,
    dc.id AS dati_catastali_id,
    dc.codice_comunale,
    dc.foglio,
    dc.particella,
    dc.subalterno,
    dc.categoria,
    dc.consistenza::text AS consistenza,
    dc.rendita::text AS rendita
  FROM immobile i
  JOIN indirizzo ind ON ind.id = i.indirizzo_id
  JOIN dati_catastali dc ON dc.id = i.dati_catastali_id
`;

function mappaImmobile(riga: ImmobileRow): Immobile {
  const indirizzo = new IndirizzoEntity({
    id: riga.indirizzo_id,
    ...(riga.nazione !== null ? { nazione: riga.nazione } : {}),
    provincia: riga.provincia,
    comune: riga.comune,
    ...(riga.cap !== null ? { cap: riga.cap } : {}),
    indirizzo: riga.indirizzo,
    ...(riga.civico !== null ? { civico: riga.civico } : {}),
    ...(riga.scala !== null ? { scala: riga.scala } : {}),
    ...(riga.interno !== null ? { interno: riga.interno } : {}),
  });

  const datiCatastali = new DatiCatastaliEntity({
    id: riga.dati_catastali_id,
    codiceComunale: riga.codice_comunale,
    foglio: riga.foglio,
    particella: riga.particella,
    subalterno: riga.subalterno,
    categoria: riga.categoria,
    consistenza: numericFromSql(riga.consistenza),
    rendita: numericFromSql(riga.rendita),
  });

  return new Immobile({
    id: riga.immobile_id,
    nome: riga.nome,
    indirizzo,
    datiCatastali,
  });
}

class PostgresImmobileRepository implements ImmobileRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async trovaTutti(): Promise<Immobile[]> {
    const risultato = await this.db.query<ImmobileRow>(`
      ${SELECT_IMMOBILE}
      ORDER BY i.id
    `);

    return risultato.rows.map(mappaImmobile);
  }

  async trovaPerId(id: number): Promise<Immobile | null> {
    const risultato = await this.db.query<ImmobileRow>(
      `
        ${SELECT_IMMOBILE}
        WHERE i.id = $1
      `,
      [id],
    );

    const riga = risultato.rows[0];
    return riga === undefined ? null : mappaImmobile(riga);
  }

  async trovaPerDatiCatastali(
    dati: DatiCatastali,
  ): Promise<Immobile | null> {
    const risultato = await this.db.query<ImmobileRow>(
      `
        ${SELECT_IMMOBILE}
        WHERE dc.codice_comunale = $1
          AND dc.foglio = $2
          AND dc.particella = $3
          AND dc.subalterno = $4
      `,
      [
        dati.codiceComunale,
        dati.foglio,
        dati.particella,
        dati.subalterno,
      ],
    );

    const riga = risultato.rows[0];
    return riga === undefined ? null : mappaImmobile(riga);
  }

  async esisteConIndirizzo(indirizzo: Indirizzo): Promise<boolean> {
    const risultato = await this.db.query<{ esiste: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM immobile i
          JOIN indirizzo ind ON ind.id = i.indirizzo_id
          WHERE ind.provincia = $1
            AND ind.comune = $2
            AND ind.indirizzo = $3
            AND ind.nazione IS NOT DISTINCT FROM $4
            AND ind.cap IS NOT DISTINCT FROM $5
            AND ind.civico IS NOT DISTINCT FROM $6
            AND ind.scala IS NOT DISTINCT FROM $7
            AND ind.interno IS NOT DISTINCT FROM $8
        ) AS esiste
      `,
      [
        indirizzo.provincia,
        indirizzo.comune,
        indirizzo.indirizzo,
        indirizzo.nazione ?? null,
        indirizzo.cap ?? null,
        indirizzo.civico ?? null,
        indirizzo.scala ?? null,
        indirizzo.interno ?? null,
      ],
    );

    return risultato.rows[0]?.esiste ?? false;
  }
}

export = PostgresImmobileRepository;
