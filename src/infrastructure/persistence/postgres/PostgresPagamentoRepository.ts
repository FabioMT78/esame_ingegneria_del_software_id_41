import type PagamentoRepository from "../../../application/ports/PagamentoRepository";
import type Pagamento from "../../../domain/Pagamento";
import type PostgresExecutor from "./PostgresExecutor";
import { dataToSql } from "./PostgresValueMapper";

class PostgresPagamentoRepository implements PagamentoRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async salva(contrattoId: number, pagamento: Pagamento): Promise<void> {
    await this.db.query(
      `
        INSERT INTO pagamento (
          contratto_id,
          anno_competenza,
          mese_competenza,
          data_pagamento,
          importo
        )
        VALUES ($1, $2, $3, $4::date, $5)
      `,
      [
        contrattoId,
        pagamento.annoCompetenza,
        pagamento.meseCompetenza,
        dataToSql(pagamento.dataPagamento),
        pagamento.importo,
      ],
    );
  }
}

export = PostgresPagamentoRepository;
