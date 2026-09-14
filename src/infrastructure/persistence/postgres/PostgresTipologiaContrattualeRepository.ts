import type TipologiaContrattualeRepository from "../../../application/ports/TipologiaContrattualeRepository";
import Articolo from "../../../domain/Articolo";
import TipologiaContrattuale from "../../../domain/TipologiaContrattuale";
import type PostgresExecutor from "./PostgresExecutor";

type TipologiaRow = {
  tipologia_id: number;
  denominazione: string;
  durata: number;
  rinnovo: number;
  articolo_id: number | null;
  num_articolo: number | null;
  num_parte: number | null;
  titolo: string | null;
  sottotitolo: string | null;
  descrizione: string | null;
};

const SELECT_TIPOLOGIA = `
  SELECT
    t.id AS tipologia_id,
    t.denominazione,
    t.durata,
    t.rinnovo,
    a.id AS articolo_id,
    a.num_articolo,
    a.num_parte,
    a.titolo,
    a.sottotitolo,
    a.descrizione
  FROM tipologia_contrattuale t
  LEFT JOIN articolo a ON a.tipologia_id = t.id
`;

function mappaTipologie(righe: TipologiaRow[]): TipologiaContrattuale[] {
  const tipologie = new Map<number, TipologiaContrattuale>();

  for (const riga of righe) {
    let tipologia = tipologie.get(riga.tipologia_id);

    if (tipologia === undefined) {
      tipologia = new TipologiaContrattuale({
        id: riga.tipologia_id,
        denominazione: riga.denominazione,
        durata: riga.durata,
        rinnovo: riga.rinnovo,
        articoli: [],
      });
      tipologie.set(riga.tipologia_id, tipologia);
    }

    if (riga.articolo_id !== null) {
      if (
        riga.num_articolo === null ||
        riga.num_parte === null ||
        riga.titolo === null ||
        riga.descrizione === null
      ) {
        throw new Error("Articolo persistito incompleto");
      }

      tipologia.articoli.push(
        new Articolo({
          id: riga.articolo_id,
          numArticolo: riga.num_articolo,
          numParte: riga.num_parte,
          titolo: riga.titolo,
          ...(riga.sottotitolo !== null
            ? { sottotitolo: riga.sottotitolo }
            : {}),
          descrizione: riga.descrizione,
        }),
      );
    }
  }

  return [...tipologie.values()];
}

class PostgresTipologiaContrattualeRepository
  implements TipologiaContrattualeRepository
{
  constructor(private readonly db: PostgresExecutor) {}

  async trovaTutte(): Promise<TipologiaContrattuale[]> {
    const risultato = await this.db.query<TipologiaRow>(`
      ${SELECT_TIPOLOGIA}
      ORDER BY t.id, a.num_articolo, a.num_parte
    `);

    return mappaTipologie(risultato.rows);
  }

  async trovaPerIdConArticoli(
    id: number,
  ): Promise<TipologiaContrattuale | null> {
    const risultato = await this.db.query<TipologiaRow>(
      `
        ${SELECT_TIPOLOGIA}
        WHERE t.id = $1
        ORDER BY a.num_articolo, a.num_parte
      `,
      [id],
    );

    return mappaTipologie(risultato.rows)[0] ?? null;
  }
}

export = PostgresTipologiaContrattualeRepository;
