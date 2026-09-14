import type Contratto from "../../domain/Contratto";

/**
 * Produce la rappresentazione documentale completa di un Contratto.
 * Il caso d'uso dipende dalla porta e non dal formato o dal renderer concreto.
 */
interface GeneratoreDocumentoContratto {
  genera(contratto: Contratto): string;
}

export = GeneratoreDocumentoContratto;
