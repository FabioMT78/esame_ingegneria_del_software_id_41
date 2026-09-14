import type Pagamento from "../../domain/Pagamento";

interface PagamentoRepository {
  salva(contrattoId: number, pagamento: Pagamento): Promise<void>;
}

export = PagamentoRepository;
