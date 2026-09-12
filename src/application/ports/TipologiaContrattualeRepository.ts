import type TipologiaContrattuale from "../../domain/TipologiaContrattuale";

interface TipologiaContrattualeRepository {
  trovaTutte(): Promise<TipologiaContrattuale[]>;
  trovaPerIdConArticoli(id: number): Promise<TipologiaContrattuale | null>;
}

export = TipologiaContrattualeRepository;
