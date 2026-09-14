import type Contratto from "../../domain/Contratto";

/**
 * Registra in modo atomico lo stato definitivo prodotto da UC-01.
 * Il Contratto ricevuto deve essere completo del contenuto storico e del
 * primo Pagamento prima dell'invocazione della porta.
 */
interface RegistrazioneContrattoPort {
  registraDefinitivamente(contratto: Contratto): Promise<void>;
}

export = RegistrazioneContrattoPort;
