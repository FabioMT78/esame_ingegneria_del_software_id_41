import type { PoolClient } from "pg";

type ScenarioRepository = {
  immobileId: number;
  proprietarioId: number;
  inquilinoId: number;
  tipologiaId: number;
};

function richiediId(righe: Array<{ id: number }>, contesto: string): number {
  const id = righe[0]?.id;

  if (id === undefined) {
    throw new Error(`Fixture PostgreSQL non creata: ${contesto}`);
  }

  return id;
}

async function inserisciIndirizzo(
  client: PoolClient,
  valori: {
    nazione?: string;
    provincia: string;
    comune: string;
    cap?: string;
    indirizzo: string;
    civico?: string;
    scala?: string;
    interno?: string;
  },
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
      valori.nazione ?? null,
      valori.provincia,
      valori.comune,
      valori.cap ?? null,
      valori.indirizzo,
      valori.civico ?? null,
      valori.scala ?? null,
      valori.interno ?? null,
    ],
  );

  return richiediId(risultato.rows, "indirizzo");
}

async function creaScenarioRepository(
  client: PoolClient,
): Promise<ScenarioRepository> {
  const indirizzoImmobileId = await inserisciIndirizzo(client, {
    nazione: "Italia",
    provincia: "RM",
    comune: "Roma",
    cap: "00100",
    indirizzo: "Via delle Rose",
    civico: "10",
    scala: "A",
    interno: "3",
  });

  const datiCatastali = await client.query<{ id: number }>(
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
      VALUES ('H501', 12, 345, 7, 'A/2', 5.50, 987.65)
      RETURNING id
    `,
  );
  const datiCatastaliId = richiediId(
    datiCatastali.rows,
    "dati catastali",
  );

  const immobile = await client.query<{ id: number }>(
    `
      INSERT INTO immobile (nome, indirizzo_id, dati_catastali_id)
      VALUES ('Casa Roma', $1, $2)
      RETURNING id
    `,
    [indirizzoImmobileId, datiCatastaliId],
  );
  const immobileId = richiediId(immobile.rows, "immobile");

  const residenzaProprietarioId = await inserisciIndirizzo(client, {
    provincia: "RM",
    comune: "Roma",
    indirizzo: "Via Proprietario",
    civico: "1",
  });
  const residenzaInquilinoId = await inserisciIndirizzo(client, {
    provincia: "MI",
    comune: "Milano",
    indirizzo: "Via Inquilino",
  });

  const proprietario = await client.query<{ id: number }>(
    `
      INSERT INTO persona (
        nome,
        cognome,
        luogo_nascita,
        data_nascita,
        codice_fiscale,
        residenza_id
      )
      VALUES (
        'Paolo',
        'Proprietario',
        'Roma',
        DATE '1970-03-15',
        'PRPPLA70C15H501X',
        $1
      )
      RETURNING id
    `,
    [residenzaProprietarioId],
  );
  const proprietarioId = richiediId(
    proprietario.rows,
    "proprietario",
  );

  const inquilino = await client.query<{ id: number }>(
    `
      INSERT INTO persona (
        nome,
        cognome,
        luogo_nascita,
        data_nascita,
        codice_fiscale,
        residenza_id
      )
      VALUES (
        'Ilaria',
        'Inquilina',
        'Milano',
        DATE '1990-11-20',
        'NQLLRI90S60F205Z',
        $1
      )
      RETURNING id
    `,
    [residenzaInquilinoId],
  );
  const inquilinoId = richiediId(inquilino.rows, "inquilino");

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
      VALUES (
        $1,
        'carta d''identità',
        'Comune di Milano',
        DATE '2025-01-10',
        DATE '2035-01-10',
        'CA7654321'
      )
    `,
    [inquilinoId],
  );

  const tipologia = await client.query<{ id: number }>(`
    INSERT INTO tipologia_contrattuale (denominazione, durata, rinnovo)
    VALUES ('Canone concordato fixture', 3, 2)
    RETURNING id
  `);
  const tipologiaId = richiediId(tipologia.rows, "tipologia");

  await client.query(
    `
      INSERT INTO articolo (
        tipologia_id,
        num_articolo,
        num_parte,
        titolo,
        sottotitolo,
        descrizione
      )
      VALUES
        ($1, 2, 0, 'Secondo articolo', NULL, 'Secondo'),
        ($1, 1, 1, 'Primo articolo', 'Parte finale', 'Uno - parte 1'),
        ($1, 1, 0, 'Primo articolo', NULL, 'Uno - parte 0')
    `,
    [tipologiaId],
  );

  return {
    immobileId,
    proprietarioId,
    inquilinoId,
    tipologiaId,
  };
}

async function inserisciContrattoFixture(
  client: PoolClient,
  scenario: ScenarioRepository,
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
        'Contratto storico fixture',
        $1,
        $2,
        $3,
        $4,
        DATE '2026-06-15',
        DATE '2029-06-14',
        950.75,
        15,
        DATE '2026-05-20',
        '<article>Contenuto storico</article>'
      )
      RETURNING id
    `,
    [
      scenario.immobileId,
      scenario.proprietarioId,
      scenario.inquilinoId,
      scenario.tipologiaId,
    ],
  );

  return richiediId(risultato.rows, "contratto");
}

export { creaScenarioRepository, inserisciContrattoFixture };
export type { ScenarioRepository };
