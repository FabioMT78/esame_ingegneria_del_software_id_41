import type Contratto from "../../domain/Contratto";

/**
 * Porta di lettura dei contratti richiesta dai casi d'uso.
 * Le implementazioni ricostruiscono il Contratto con i pagamenti già registrati.
 */
interface ContrattoRepository {
  /** Restituisce il contratto identificato, oppure null se non esiste. */
  trovaPerId(id: number): Promise<Contratto | null>;

  /** Restituisce i contratti registrati relativi all'immobile indicato. */
  trovaPerImmobile(immobileId: number): Promise<Contratto[]>;

  /**
   * Verifica se esiste un contratto dello stesso immobile il cui periodo
   * si sovrappone all'intervallo inclusivo dal-al.
   */
  esisteSovrapposizione(
    immobileId: number,
    dal: Date,
    al: Date,
  ): Promise<boolean>;
}

export = ContrattoRepository;
