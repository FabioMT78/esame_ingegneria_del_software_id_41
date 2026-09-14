import type ContrattoRepository from "../../../application/ports/ContrattoRepository";
import Contratto from "../../../domain/Contratto";
import Pagamento from "../../../domain/Pagamento";
import PostgresImmobileRepository from "./PostgresImmobileRepository";
import PostgresPersonaRepository from "./PostgresPersonaRepository";
import PostgresTipologiaContrattualeRepository from "./PostgresTipologiaContrattualeRepository";
import type PostgresExecutor from "./PostgresExecutor";
import {
  dataFromSql,
  dataToSql,
  numericFromSql,
} from "./PostgresValueMapper";

type ContrattoRow = {
  id: number;
  nome_descrizione: string;
  immobile_id: number;
  proprietario_id: number;
  inquilino_id: number;
  tipologia_id: number;
  dal: string;
  al: string;
  canone_mensile: string | number;
  giorno_pagamento: number;
  registrato_il: string;
  contenuto: string;
};

type PagamentoRow = {
  id: number;
  anno_competenza: number;
  mese_competenza: number;
  data_pagamento: string;
  importo: string | number;
};

const SELECT_CONTRATTO = `
  SELECT
    id,
    nome_descrizione,
    immobile_id,
    proprietario_id,
    inquilino_id,
    tipologia_id,
    dal::text AS dal,
    al::text AS al,
    canone_mensile::text AS canone_mensile,
    giorno_pagamento,
    registrato_il::text AS registrato_il,
    contenuto
  FROM contratto
`;

class PostgresContrattoRepository implements ContrattoRepository {
  private readonly immobileRepository: PostgresImmobileRepository;
  private readonly personaRepository: PostgresPersonaRepository;
  private readonly tipologiaRepository: PostgresTipologiaContrattualeRepository;

  constructor(private readonly db: PostgresExecutor) {
    this.immobileRepository = new PostgresImmobileRepository(db);
    this.personaRepository = new PostgresPersonaRepository(db);
    this.tipologiaRepository =
      new PostgresTipologiaContrattualeRepository(db);
  }

  async trovaPerId(id: number): Promise<Contratto | null> {
    const risultato = await this.db.query<ContrattoRow>(
      `
        ${SELECT_CONTRATTO}
        WHERE id = $1
      `,
      [id],
    );

    const riga = risultato.rows[0];
    return riga === undefined ? null : this.mappaContratto(riga);
  }

  async trovaPerImmobile(immobileId: number): Promise<Contratto[]> {
    const risultato = await this.db.query<ContrattoRow>(
      `
        ${SELECT_CONTRATTO}
        WHERE immobile_id = $1
        ORDER BY dal, id
      `,
      [immobileId],
    );

    const contratti: Contratto[] = [];

    for (const riga of risultato.rows) {
      contratti.push(await this.mappaContratto(riga));
    }

    return contratti;
  }

  async esisteSovrapposizione(
    immobileId: number,
    dal: Date,
    al: Date,
  ): Promise<boolean> {
    const risultato = await this.db.query<{ esiste: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM contratto
          WHERE immobile_id = $1
            AND dal <= $3::date
            AND al >= $2::date
        ) AS esiste
      `,
      [immobileId, dataToSql(dal), dataToSql(al)],
    );

    return risultato.rows[0]?.esiste ?? false;
  }

  private async mappaContratto(riga: ContrattoRow): Promise<Contratto> {
    /*
     * Le query sono intenzionalmente sequenziali.
     * PostgresExecutor può essere anche un singolo PoolClient (per esempio nei test
     * e nelle operazioni transazionali), sul quale pg non supporta query concorrenti.
     */
    const immobile = await this.immobileRepository.trovaPerId(riga.immobile_id);
    const proprietario = await this.personaRepository.trovaPerId(
      riga.proprietario_id,
    );
    const inquilino = await this.personaRepository.trovaPerId(
      riga.inquilino_id,
    );
    const tipologia = await this.tipologiaRepository.trovaPerIdConArticoli(
      riga.tipologia_id,
    );
    const pagamenti = await this.trovaPagamenti(riga.id);

    if (
      immobile === null ||
      proprietario === null ||
      inquilino === null ||
      tipologia === null
    ) {
      throw new Error(
        `Contratto ${riga.id} riferisce dati persistiti non disponibili`,
      );
    }

    const contratto = new Contratto({
      id: riga.id,
      nomeDescrizione: riga.nome_descrizione,
      immobile,
      proprietario,
      inquilino,
      tipologia,
      dal: dataFromSql(riga.dal),
      al: dataFromSql(riga.al),
      canoneMensile: numericFromSql(riga.canone_mensile),
      giornoPagamento: riga.giorno_pagamento,
      registratoIl: dataFromSql(riga.registrato_il),
    });

    contratto.impostaContenuto(riga.contenuto);

    for (const pagamento of pagamenti) {
      contratto.aggiungiPagamento(pagamento);
    }

    return contratto;
  }

  private async trovaPagamenti(contrattoId: number): Promise<Pagamento[]> {
    const risultato = await this.db.query<PagamentoRow>(
      `
        SELECT
          id,
          anno_competenza,
          mese_competenza,
          data_pagamento::text AS data_pagamento,
          importo::text AS importo
        FROM pagamento
        WHERE contratto_id = $1
        ORDER BY anno_competenza, mese_competenza
      `,
      [contrattoId],
    );

    return risultato.rows.map(
      (riga) =>
        new Pagamento({
          id: riga.id,
          annoCompetenza: riga.anno_competenza,
          meseCompetenza: riga.mese_competenza,
          dataPagamento: dataFromSql(riga.data_pagamento),
          importo: numericFromSql(riga.importo),
        }),
    );
  }
}

export = PostgresContrattoRepository;
