import type { Pool, PoolClient } from "pg";
import type RegistrazioneContrattoPort from "../../../application/ports/RegistrazioneContrattoPort";
import type Contratto from "../../../domain/Contratto";
import type DatiCatastali from "../../../domain/DatiCatastali";
import type DocumentoRiconoscimento from "../../../domain/DocumentoRiconoscimento";
import type Immobile from "../../../domain/Immobile";
import type Indirizzo from "../../../domain/Indirizzo";
import type Persona from "../../../domain/Persona";
import { dataToSql } from "./PostgresValueMapper";

type DatabasePostgres = Pool | PoolClient;

type PersonaPersistitaRow = {
  id: number;
  codice_fiscale: string;
  residenza_id: number;
};

type IndirizzoRow = {
  nazione: string | null;
  provincia: string;
  comune: string;
  cap: string | null;
  indirizzo: string;
  civico: string | null;
  scala: string | null;
  interno: string | null;
};

type DatiCatastaliPersistitiRow = {
  codice_comunale: string;
  foglio: number;
  particella: number;
  subalterno: number;
};

class PostgresRegistrazioneContratto implements RegistrazioneContrattoPort {
  constructor(private readonly db: DatabasePostgres) {}

  async registraDefinitivamente(contratto: Contratto): Promise<void> {
    this.validaPrecondizioni(contratto);

    const { client, deveRilasciare } = await this.ottieniClient();
    let transazioneAvviata = false;

    try {
      await client.query("BEGIN");
      transazioneAvviata = true;

      const tipologiaId = this.richiediIdTipologia(contratto);
      await this.verificaTipologiaPersistita(client, tipologiaId);

      const immobileId = await this.persistiImmobile(
        client,
        contratto.immobile,
      );
      const proprietarioId = await this.persistiPersona(
        client,
        contratto.proprietario,
      );
      const inquilinoId = await this.persistiPersona(
        client,
        contratto.inquilino,
      );

      const contrattoId = await this.inserisciContratto(
        client,
        contratto,
        immobileId,
        proprietarioId,
        inquilinoId,
        tipologiaId,
      );

      for (const pagamento of contratto.pagamenti) {
        await client.query(
          `
            INSERT INTO pagamento (
              contratto_id,
              anno_competenza,
              mese_competenza,
              data_pagamento,
              importo
            )
            VALUES ($1, $2, $3, $4::date, $5)
          `,
          [
            contrattoId,
            pagamento.annoCompetenza,
            pagamento.meseCompetenza,
            dataToSql(pagamento.dataPagamento),
            pagamento.importo,
          ],
        );
      }

      await client.query("COMMIT");
      transazioneAvviata = false;
    } catch (errore) {
      if (transazioneAvviata) {
        await client.query("ROLLBACK");
      }
      throw errore;
    } finally {
      if (deveRilasciare) {
        client.release();
      }
    }
  }

  private validaPrecondizioni(contratto: Contratto): void {
    if (
      contratto.contenuto === undefined ||
      contratto.contenuto.trim().length === 0
    ) {
      throw new Error(
        "Il contratto definitivo deve contenere il documento storico",
      );
    }

    if (contratto.pagamenti.length === 0) {
      throw new Error(
        "Il contratto definitivo deve contenere almeno un pagamento",
      );
    }

    if (contratto.tipologia.id === undefined) {
      throw new Error(
        "La tipologia contrattuale deve essere già persistita",
      );
    }
  }

  private richiediIdTipologia(contratto: Contratto): number {
    const id = contratto.tipologia.id;

    if (id === undefined) {
      throw new Error(
        "La tipologia contrattuale deve essere già persistita",
      );
    }

    return id;
  }

  private async ottieniClient(): Promise<{
    client: PoolClient;
    deveRilasciare: boolean;
  }> {
    if ("release" in this.db && typeof this.db.release === "function") {
      return {
        client: this.db as PoolClient,
        deveRilasciare: false,
      };
    }

    return {
      client: await (this.db as Pool).connect(),
      deveRilasciare: true,
    };
  }

  private async verificaTipologiaPersistita(
    client: PoolClient,
    tipologiaId: number,
  ): Promise<void> {
    const risultato = await client.query<{ id: number }>(
      `
        SELECT id
        FROM tipologia_contrattuale
        WHERE id = $1
      `,
      [tipologiaId],
    );

    if (risultato.rows[0] === undefined) {
      throw new Error("Tipologia contrattuale persistita non disponibile");
    }
  }

  private async persistiImmobile(
    client: PoolClient,
    immobile: Immobile,
  ): Promise<number> {
    if (immobile.id !== undefined) {
      await this.verificaImmobilePersistito(client, immobile);
      return immobile.id;
    }

    const indirizzoId = await this.inserisciIndirizzo(
      client,
      immobile.indirizzo,
    );
    const datiCatastaliId = await this.inserisciDatiCatastali(
      client,
      immobile.datiCatastali,
    );

    const risultato = await client.query<{ id: number }>(
      `
        INSERT INTO immobile (nome, indirizzo_id, dati_catastali_id)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [immobile.nome, indirizzoId, datiCatastaliId],
    );

    return this.richiediId(risultato.rows, "immobile");
  }

  private async verificaImmobilePersistito(
    client: PoolClient,
    immobile: Immobile,
  ): Promise<void> {
    const risultato = await client.query<DatiCatastaliPersistitiRow>(
      `
        SELECT
          dc.codice_comunale,
          dc.foglio,
          dc.particella,
          dc.subalterno
        FROM immobile i
        JOIN dati_catastali dc ON dc.id = i.dati_catastali_id
        WHERE i.id = $1
      `,
      [immobile.id],
    );

    const riga = risultato.rows[0];

    if (riga === undefined) {
      throw new Error("Immobile persistito non disponibile");
    }

    if (
      riga.codice_comunale !== immobile.datiCatastali.codiceComunale ||
      riga.foglio !== immobile.datiCatastali.foglio ||
      riga.particella !== immobile.datiCatastali.particella ||
      riga.subalterno !== immobile.datiCatastali.subalterno
    ) {
      throw new Error(
        "Immobile persistito non coerente con la bozza da registrare",
      );
    }
  }

  private async inserisciDatiCatastali(
    client: PoolClient,
    dati: DatiCatastali,
  ): Promise<number> {
    const risultato = await client.query<{ id: number }>(
      `
        INSERT INTO dati_catastali (
          codice_comunale,
          foglio,
          particella,
          subalterno,
          categoria,
          consistenza,
          rendita
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        dati.codiceComunale,
        dati.foglio,
        dati.particella,
        dati.subalterno,
        dati.categoria,
        dati.consistenza,
        dati.rendita,
      ],
    );

    return this.richiediId(risultato.rows, "dati catastali");
  }

  private async persistiPersona(
    client: PoolClient,
    persona: Persona,
  ): Promise<number> {
    const persistita = await this.trovaPersonaPersistita(client, persona);

    let personaId: number;

    if (persistita === null) {
      const residenzaId = await this.inserisciIndirizzo(
        client,
        persona.residenza,
      );

      const risultato = await client.query<{ id: number }>(
        `
          INSERT INTO persona (
            nome,
            cognome,
            luogo_nascita,
            data_nascita,
            codice_fiscale,
            iban,
            residenza_id
          )
          VALUES ($1, $2, $3, $4::date, $5, $6, $7)
          RETURNING id
        `,
        [
          persona.nome,
          persona.cognome,
          persona.luogoNascita,
          dataToSql(persona.dataNascita),
          persona.codiceFiscale,
          persona.iban ?? null,
          residenzaId,
        ],
      );

      personaId = this.richiediId(risultato.rows, "persona");
    } else {
      const residenzaId = await this.sincronizzaResidenza(
        client,
        persistita.residenza_id,
        persona.residenza,
      );

      await client.query(
        `
          UPDATE persona
          SET
            nome = $1,
            cognome = $2,
            luogo_nascita = $3,
            data_nascita = $4::date,
            iban = $5,
            residenza_id = $6
          WHERE id = $7
        `,
        [
          persona.nome,
          persona.cognome,
          persona.luogoNascita,
          dataToSql(persona.dataNascita),
          persona.iban ?? null,
          residenzaId,
          persistita.id,
        ],
      );

      personaId = persistita.id;
    }

    if (persona.documento !== undefined) {
      await this.sincronizzaDocumento(
        client,
        personaId,
        persona.documento,
      );
    }

    return personaId;
  }

  private async trovaPersonaPersistita(
    client: PoolClient,
    persona: Persona,
  ): Promise<PersonaPersistitaRow | null> {
    if (persona.id !== undefined) {
      const risultato = await client.query<PersonaPersistitaRow>(
        `
          SELECT id, codice_fiscale, residenza_id
          FROM persona
          WHERE id = $1
          FOR UPDATE
        `,
        [persona.id],
      );

      const riga = risultato.rows[0];

      if (riga === undefined) {
        throw new Error("Persona persistita non disponibile");
      }

      if (riga.codice_fiscale !== persona.codiceFiscale) {
        throw new Error(
          "Il codice fiscale della persona persistita non può essere modificato",
        );
      }

      return riga;
    }

    const risultato = await client.query<PersonaPersistitaRow>(
      `
        SELECT id, codice_fiscale, residenza_id
        FROM persona
        WHERE codice_fiscale = $1
        FOR UPDATE
      `,
      [persona.codiceFiscale],
    );

    return risultato.rows[0] ?? null;
  }

  private async sincronizzaResidenza(
    client: PoolClient,
    residenzaPersistitaId: number,
    residenza: Indirizzo,
  ): Promise<number> {
    const risultato = await client.query<IndirizzoRow>(
      `
        SELECT
          nazione,
          provincia,
          comune,
          cap,
          indirizzo,
          civico,
          scala,
          interno
        FROM indirizzo
        WHERE id = $1
      `,
      [residenzaPersistitaId],
    );

    const riga = risultato.rows[0];

    if (riga === undefined) {
      throw new Error("Residenza persistita non disponibile");
    }

    if (this.stessoIndirizzo(riga, residenza)) {
      return residenzaPersistitaId;
    }

    return this.inserisciIndirizzo(client, residenza);
  }

  private stessoIndirizzo(
    persistito: IndirizzoRow,
    indirizzo: Indirizzo,
  ): boolean {
    return (
      persistito.nazione === (indirizzo.nazione ?? null) &&
      persistito.provincia === indirizzo.provincia &&
      persistito.comune === indirizzo.comune &&
      persistito.cap === (indirizzo.cap ?? null) &&
      persistito.indirizzo === indirizzo.indirizzo &&
      persistito.civico === (indirizzo.civico ?? null) &&
      persistito.scala === (indirizzo.scala ?? null) &&
      persistito.interno === (indirizzo.interno ?? null)
    );
  }

  private async inserisciIndirizzo(
    client: PoolClient,
    indirizzo: Indirizzo,
  ): Promise<number> {
    const risultato = await client.query<{ id: number }>(
      `
        INSERT INTO indirizzo (
          nazione,
          provincia,
          comune,
          cap,
          indirizzo,
          civico,
          scala,
          interno
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        indirizzo.nazione ?? null,
        indirizzo.provincia,
        indirizzo.comune,
        indirizzo.cap ?? null,
        indirizzo.indirizzo,
        indirizzo.civico ?? null,
        indirizzo.scala ?? null,
        indirizzo.interno ?? null,
      ],
    );

    return this.richiediId(risultato.rows, "indirizzo");
  }

  private async sincronizzaDocumento(
    client: PoolClient,
    personaId: number,
    documento: DocumentoRiconoscimento,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO documento_riconoscimento (
          persona_id,
          tipo,
          organo_emittente,
          data_rilascio,
          data_scadenza,
          numero
        )
        VALUES ($1, $2, $3, $4::date, $5::date, $6)
        ON CONFLICT (persona_id)
        DO UPDATE SET
          tipo = EXCLUDED.tipo,
          organo_emittente = EXCLUDED.organo_emittente,
          data_rilascio = EXCLUDED.data_rilascio,
          data_scadenza = EXCLUDED.data_scadenza,
          numero = EXCLUDED.numero
      `,
      [
        personaId,
        documento.tipo,
        documento.organoEmittente,
        dataToSql(documento.dataRilascio),
        dataToSql(documento.dataScadenza),
        documento.numero,
      ],
    );
  }

  private async inserisciContratto(
    client: PoolClient,
    contratto: Contratto,
    immobileId: number,
    proprietarioId: number,
    inquilinoId: number,
    tipologiaId: number,
  ): Promise<number> {
    const risultato = await client.query<{ id: number }>(
      `
        INSERT INTO contratto (
          nome_descrizione,
          immobile_id,
          proprietario_id,
          inquilino_id,
          tipologia_id,
          dal,
          al,
          canone_mensile,
          giorno_pagamento,
          registrato_il,
          contenuto
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::date,
          $7::date,
          $8,
          $9,
          $10::date,
          $11
        )
        RETURNING id
      `,
      [
        contratto.nomeDescrizione,
        immobileId,
        proprietarioId,
        inquilinoId,
        tipologiaId,
        dataToSql(contratto.dal),
        dataToSql(contratto.al),
        contratto.canoneMensile,
        contratto.giornoPagamento,
        dataToSql(contratto.registratoIl),
        contratto.contenuto,
      ],
    );

    return this.richiediId(risultato.rows, "contratto");
  }

  private richiediId(
    righe: Array<{ id: number }>,
    contesto: string,
  ): number {
    const id = righe[0]?.id;

    if (id === undefined) {
      throw new Error(`Persistenza PostgreSQL non riuscita: ${contesto}`);
    }

    return id;
  }
}

export = PostgresRegistrazioneContratto;
