import type Contratto from "../../domain/Contratto";

interface ContrattoRepository {
  trovaPerId(id: number): Promise<Contratto | null>;
  trovaPerImmobile(immobileId: number): Promise<Contratto[]>;
  esisteSovrapposizione(
    immobileId: number,
    dal: Date,
    al: Date,
  ): Promise<boolean>;
}

export = ContrattoRepository;
