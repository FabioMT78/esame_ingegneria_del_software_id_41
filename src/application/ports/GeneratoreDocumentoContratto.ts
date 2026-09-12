import type Contratto from "../../domain/Contratto";

interface GeneratoreDocumentoContratto {
  genera(contratto: Contratto): string;
}

export = GeneratoreDocumentoContratto;
