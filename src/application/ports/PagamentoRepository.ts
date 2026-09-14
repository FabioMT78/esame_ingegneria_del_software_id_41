import type Pagamento from "../../domain/Pagamento";

/**
 * Porta di scrittura specifica di UC-02.
 * I pagamenti storici vengono letti come parte del Contratto tramite
 * ContrattoRepository; questa porta registra soltanto il nuovo fatto storico.
 */
interface PagamentoRepository {
  salva(contrattoId: number, pagamento: Pagamento): Promise<void>;
}

export = PagamentoRepository;
