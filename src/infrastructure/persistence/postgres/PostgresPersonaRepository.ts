import type PersonaRepository from "../../../application/ports/PersonaRepository";
import DocumentoRiconoscimento from "../../../domain/DocumentoRiconoscimento";
import Indirizzo from "../../../domain/Indirizzo";
import Persona from "../../../domain/Persona";
import type PostgresExecutor from "./PostgresExecutor";
import { dataFromSql } from "./PostgresValueMapper";

type TipoDocumento = "carta d'identità" | "passaporto";

type PersonaRow = {
  persona_id: number;
  nome: string;
  cognome: string;
  luogo_nascita: string;
  data_nascita: string;
  codice_fiscale: string;
  iban: string | null;
  residenza_id: number;
  nazione: string | null;
  provincia: string;
  comune: string;
  cap: string | null;
  indirizzo: string;
  civico: string | null;
  scala: string | null;
  interno: string | null;
  documento_id: number | null;
  tipo_documento: string | null;
  organo_emittente: string | null;
  data_rilascio: string | null;
  data_scadenza: string | null;
  numero_documento: string | null;
};

const SELECT_PERSONA = `
  SELECT
    p.id AS persona_id,
    p.nome,
    p.cognome,
    p.luogo_nascita,
    p.data_nascita::text AS data_nascita,
    p.codice_fiscale,
    p.iban,
    r.id AS residenza_id,
    r.nazione,
    r.provincia,
    r.comune,
    r.cap,
    r.indirizzo,
    r.civico,
    r.scala,
    r.interno,
    d.id AS documento_id,
    d.tipo AS tipo_documento,
    d.organo_emittente,
    d.data_rilascio::text AS data_rilascio,
    d.data_scadenza::text AS data_scadenza,
    d.numero AS numero_documento
  FROM persona p
  JOIN indirizzo r ON r.id = p.residenza_id
  LEFT JOIN documento_riconoscimento d ON d.persona_id = p.id
`;

function tipoDocumentoDaSql(valore: string): TipoDocumento {
  if (valore !== "carta d'identità" && valore !== "passaporto") {
    throw new Error("Tipo di documento persistito non riconosciuto");
  }

  return valore;
}

function mappaPersona(riga: PersonaRow): Persona {
  const residenza = new Indirizzo({
    id: riga.residenza_id,
    ...(riga.nazione !== null ? { nazione: riga.nazione } : {}),
    provincia: riga.provincia,
    comune: riga.comune,
    ...(riga.cap !== null ? { cap: riga.cap } : {}),
    indirizzo: riga.indirizzo,
    ...(riga.civico !== null ? { civico: riga.civico } : {}),
    ...(riga.scala !== null ? { scala: riga.scala } : {}),
    ...(riga.interno !== null ? { interno: riga.interno } : {}),
  });

  let documento: DocumentoRiconoscimento | undefined;

  if (riga.documento_id !== null) {
    if (
      riga.tipo_documento === null ||
      riga.organo_emittente === null ||
      riga.data_rilascio === null ||
      riga.data_scadenza === null ||
      riga.numero_documento === null
    ) {
      throw new Error("Documento di riconoscimento persistito incompleto");
    }

    documento = new DocumentoRiconoscimento({
      id: riga.documento_id,
      tipo: tipoDocumentoDaSql(riga.tipo_documento),
      organoEmittente: riga.organo_emittente,
      dataRilascio: dataFromSql(riga.data_rilascio),
      dataScadenza: dataFromSql(riga.data_scadenza),
      numero: riga.numero_documento,
    });
  }

  return new Persona({
    id: riga.persona_id,
    nome: riga.nome,
    cognome: riga.cognome,
    luogoNascita: riga.luogo_nascita,
    dataNascita: dataFromSql(riga.data_nascita),
    codiceFiscale: riga.codice_fiscale,
    residenza,
    ...(riga.iban !== null ? { iban: riga.iban } : {}),
    ...(documento !== undefined ? { documento } : {}),
  });
}

class PostgresPersonaRepository implements PersonaRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async trovaPerCodiceFiscale(
    codiceFiscale: string,
  ): Promise<Persona | null> {
    const risultato = await this.db.query<PersonaRow>(
      `
        ${SELECT_PERSONA}
        WHERE p.codice_fiscale = $1
      `,
      [codiceFiscale],
    );

    const riga = risultato.rows[0];
    return riga === undefined ? null : mappaPersona(riga);
  }

  async trovaPerId(id: number): Promise<Persona | null> {
    const risultato = await this.db.query<PersonaRow>(
      `
        ${SELECT_PERSONA}
        WHERE p.id = $1
      `,
      [id],
    );

    const riga = risultato.rows[0];
    return riga === undefined ? null : mappaPersona(riga);
  }
}

export = PostgresPersonaRepository;
