import type Contratto from "../../domain/Contratto";

interface RegistrazioneContrattoPort {
  registraDefinitivamente(contratto: Contratto): Promise<void>;
}

export = RegistrazioneContrattoPort;
