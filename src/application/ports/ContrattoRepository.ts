import type Contratto from "../../domain/Contratto";

interface ContrattoRepository {
  trovaPerId(id: number): Promise<Contratto | null>;
  trovaPerImmobile(immobileId: number): Promise<Contratto[]>;
}

export = ContrattoRepository;
