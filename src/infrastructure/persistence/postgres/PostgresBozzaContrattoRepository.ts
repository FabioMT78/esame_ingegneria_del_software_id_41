import type BozzaContratto from "../../../application/model/BozzaContratto";
import type BozzaContrattoRepository from "../../../application/ports/BozzaContrattoRepository";
import BozzaContrattoJsonMapper from "./BozzaContrattoJsonMapper";
import type PostgresExecutor from "./PostgresExecutor";

type BozzaRow = {
  id_bozza: number;
  dati: unknown;
};

class PostgresBozzaContrattoRepository
  implements BozzaContrattoRepository
{
  constructor(private readonly db: PostgresExecutor) {}

  async elenca(): Promise<BozzaContratto[]> {
    const risultato = await this.db.query<BozzaRow>(`
      SELECT id_bozza, dati
      FROM bozza_contratto
      ORDER BY id_bozza
    `);

    return risultato.rows.map((riga) =>
      BozzaContrattoJsonMapper.deserializza(riga.id_bozza, riga.dati),
    );
  }

  async trovaPerId(idBozza: number): Promise<BozzaContratto | null> {
    const risultato = await this.db.query<BozzaRow>(
      `
        SELECT id_bozza, dati
        FROM bozza_contratto
        WHERE id_bozza = $1
      `,
      [idBozza],
    );

    const riga = risultato.rows[0];

    return riga === undefined
      ? null
      : BozzaContrattoJsonMapper.deserializza(riga.id_bozza, riga.dati);
  }

  async trovaPerImmobileId(
    immobileId: number,
  ): Promise<BozzaContratto | null> {
    const risultato = await this.db.query<BozzaRow>(
      `
        SELECT id_bozza, dati
        FROM bozza_contratto
        WHERE immobile_id = $1
      `,
      [immobileId],
    );

    const riga = risultato.rows[0];

    return riga === undefined
      ? null
      : BozzaContrattoJsonMapper.deserializza(riga.id_bozza, riga.dati);
  }

  async salva(bozza: BozzaContratto): Promise<BozzaContratto> {
    const immobileId = bozza.immobile?.id ?? null;
    const dati = JSON.stringify(BozzaContrattoJsonMapper.serializza(bozza));

    const risultato =
      bozza.idBozza === undefined
        ? await this.db.query<BozzaRow>(
            `
              INSERT INTO bozza_contratto (immobile_id, dati)
              VALUES ($1, $2::jsonb)
              RETURNING id_bozza, dati
            `,
            [immobileId, dati],
          )
        : await this.db.query<BozzaRow>(
            `
              UPDATE bozza_contratto
              SET immobile_id = $1,
                  dati = $2::jsonb
              WHERE id_bozza = $3
              RETURNING id_bozza, dati
            `,
            [immobileId, dati, bozza.idBozza],
          );

    const riga = risultato.rows[0];

    if (riga === undefined) {
      throw new Error("Bozza non trovata durante il salvataggio");
    }

    return BozzaContrattoJsonMapper.deserializza(
      riga.id_bozza,
      riga.dati,
    );
  }

  async elimina(idBozza: number): Promise<void> {
    await this.db.query(
      `
        DELETE FROM bozza_contratto
        WHERE id_bozza = $1
      `,
      [idBozza],
    );
  }
}

export = PostgresBozzaContrattoRepository;
