import type { PoolClient } from "pg";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";

type DatiBaseContratto = {
  immobileId: number;
  proprietarioId: number;
  inquilinoId: number;
  tipologiaId: number;
};

async function inserisciIndirizzo(
  client: PoolClient,
  indirizzo: string,
): Promise<number> {
  const risultato = await client.query<{ id: number }>(
    `
      INSERT INTO indirizzo (provincia, comune, indirizzo)
      VALUES ('RM', 'Roma', $1)
      RETURNING id
    `,
    [indirizzo],
  );
  const id = risultato.rows[0]?.id;

  if (id === undefined) {
    throw new Error("Inserimento indirizzo non riuscito");
  }

  return id;
}

async function inserisciPersona(
  client: PoolClient,
  codiceFiscale: string,
  residenzaId: number,
): Promise<number> {
  const risultato = await client.query<{ id: number }>(
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
        'Mario',
        'Rossi',
        'Roma',
        DATE '1980-01-10',
        $1,
        $2
      )
      RETURNING id
    `,
    [codiceFiscale, residenzaId],
  );
  const id = risultato.rows[0]?.id;

  if (id === undefined) {
    throw new Error("Inserimento persona non riuscito");
  }

  return id;
}

async function inserisciDatiBaseContratto(
  client: PoolClient,
): Promise<DatiBaseContratto> {
  const indirizzoImmobileId = await inserisciIndirizzo(
    client,
    "Via Immobile 10",
  );
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
      VALUES ('H501', 1, 10, 1, 'A/2', 5, 1000)
      RETURNING id
    `,
  );
  const datiCatastaliId = datiCatastali.rows[0]?.id;

  if (datiCatastaliId === undefined) {
    throw new Error("Inserimento dati catastali non riuscito");
  }

  const immobile = await client.query<{ id: number }>(
    `
      INSERT INTO immobile (nome, indirizzo_id, dati_catastali_id)
      VALUES ('Casa Roma', $1, $2)
      RETURNING id
    `,
    [indirizzoImmobileId, datiCatastaliId],
  );
  const immobileId = immobile.rows[0]?.id;

  if (immobileId === undefined) {
    throw new Error("Inserimento immobile non riuscito");
  }

  const residenzaProprietarioId = await inserisciIndirizzo(
    client,
    "Via Proprietario 1",
  );
  const residenzaInquilinoId = await inserisciIndirizzo(
    client,
    "Via Inquilino 2",
  );
  const proprietarioId = await inserisciPersona(
    client,
    "RSSMRA80A10H501U",
    residenzaProprietarioId,
  );
  const inquilinoId = await inserisciPersona(
    client,
    "VRDLGI90B20H501X",
    residenzaInquilinoId,
  );

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
        'Comune di Roma',
        DATE '2024-01-01',
        DATE '2034-01-01',
        'CA1234567'
      )
    `,
    [inquilinoId],
  );

  const tipologia = await client.query<{ id: number }>(
    `
      INSERT INTO tipologia_contrattuale (
        denominazione,
        durata,
        rinnovo
      )
      VALUES ('Tipologia test 3+2', 3, 2)
      RETURNING id
    `,
  );
  const tipologiaId = tipologia.rows[0]?.id;

  if (tipologiaId === undefined) {
    throw new Error("Inserimento tipologia non riuscito");
  }

  await client.query(
    `
      INSERT INTO articolo (
        tipologia_id,
        num_articolo,
        num_parte,
        titolo,
        descrizione
      )
      VALUES ($1, 1, 0, 'Articolo test', 'Testo di test')
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

async function inserisciContratto(
  client: PoolClient,
  dati: DatiBaseContratto,
  giornoPagamento = 15,
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
        'Contratto test',
        $1,
        $2,
        $3,
        $4,
        DATE '2026-06-01',
        DATE '2029-05-31',
        1000.00,
        $5,
        DATE '2026-05-20',
        '<article>Contratto test</article>'
      )
      RETURNING id
    `,
    [
      dati.immobileId,
      dati.proprietarioId,
      dati.inquilinoId,
      dati.tipologiaId,
      giornoPagamento,
    ],
  );
  const id = risultato.rows[0]?.id;

  if (id === undefined) {
    throw new Error("Inserimento contratto non riuscito");
  }

  return id;
}

describe("schema PostgreSQL", () => {
  let database: PostgresTestDatabase;

  beforeAll(async () => {
    database = await PostgresTestDatabase.crea();
  });

  beforeEach(async () => {
    await database.reset();
  });

  afterAll(async () => {
    await database.chiudi();
  });

  test("crea le tabelle previste dalla baseline", async () => {
    const risultato = await database.client.query<{ table_name: string }>(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name
      `,
      [database.schemaName],
    );

    expect(risultato.rows.map((riga) => riga.table_name)).toEqual([
      "articolo",
      "bozza_contratto",
      "contratto",
      "dati_catastali",
      "documento_riconoscimento",
      "immobile",
      "indirizzo",
      "pagamento",
      "persona",
      "tipologia_contrattuale",
    ]);
  });

  test("mantiene dal e al come DATE senza trasformazioni di fuso orario", async () => {
    const dati = await inserisciDatiBaseContratto(database.client);
    const contrattoId = await inserisciContratto(database.client, dati);

    const risultato = await database.client.query<{
      dal: string;
      al: string;
    }>(
      `
        SELECT dal::text AS dal, al::text AS al
        FROM contratto
        WHERE id = $1
      `,
      [contrattoId],
    );

    expect(risultato.rows[0]).toEqual({
      dal: "2026-06-01",
      al: "2029-05-31",
    });
  });

  test("impedisce duplicati della chiave catastale", async () => {
    await database.client.query(`
      INSERT INTO dati_catastali (
        codice_comunale,
        foglio,
        particella,
        subalterno,
        categoria,
        consistenza,
        rendita
      )
      VALUES ('H501', 1, 10, 1, 'A/2', 5, 1000)
    `);

    await expect(
      database.client.query(`
        INSERT INTO dati_catastali (
          codice_comunale,
          foglio,
          particella,
          subalterno,
          categoria,
          consistenza,
          rendita
        )
        VALUES ('H501', 1, 10, 1, 'A/3', 6, 1100)
      `),
    ).rejects.toMatchObject({ code: "23505" });
  });

  test("applica i vincoli essenziali di contratto e pagamento", async () => {
    const dati = await inserisciDatiBaseContratto(database.client);

    await expect(
      inserisciContratto(database.client, dati, 29),
    ).rejects.toMatchObject({ code: "23514" });

    const contrattoId = await inserisciContratto(database.client, dati);

    await database.client.query(
      `
        INSERT INTO pagamento (
          contratto_id,
          anno_competenza,
          mese_competenza,
          data_pagamento,
          importo
        )
        VALUES ($1, 2026, 6, DATE '2026-06-01', 1000.00)
      `,
      [contrattoId],
    );

    await expect(
      database.client.query(
        `
          INSERT INTO pagamento (
            contratto_id,
            anno_competenza,
            mese_competenza,
            data_pagamento,
            importo
          )
          VALUES ($1, 2026, 6, DATE '2026-06-02', 1000.00)
        `,
        [contrattoId],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  test("consente più bozze per immobili nuovi ma una sola per un immobile registrato", async () => {
    const dati = await inserisciDatiBaseContratto(database.client);

    await database.client.query(
      `
        INSERT INTO bozza_contratto (immobile_id, dati)
        VALUES ($1, '{"stepCompletato":1}'::jsonb)
      `,
      [dati.immobileId],
    );

    await expect(
      database.client.query(
        `
          INSERT INTO bozza_contratto (immobile_id, dati)
          VALUES ($1, '{"stepCompletato":2}'::jsonb)
        `,
        [dati.immobileId],
      ),
    ).rejects.toMatchObject({ code: "23505" });

    await database.client.query(`
      INSERT INTO bozza_contratto (immobile_id, dati)
      VALUES
        (NULL, '{"stepCompletato":1,"nome":"nuova-1"}'::jsonb),
        (NULL, '{"stepCompletato":1,"nome":"nuova-2"}'::jsonb)
    `);

    const risultato = await database.client.query<{ totale: string }>(`
      SELECT COUNT(*)::text AS totale
      FROM bozza_contratto
      WHERE immobile_id IS NULL
    `);

    expect(risultato.rows[0]?.totale).toBe("2");
  });

  test("predispone un indice per la ricerca di sovrapposizioni per immobile e periodo", async () => {
    const risultato = await database.client.query<{ indexname: string }>(
      `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = $1
          AND tablename = 'contratto'
      `,
      [database.schemaName],
    );

    expect(risultato.rows.map((riga) => riga.indexname)).toContain(
      "idx_contratto_immobile_periodo",
    );
  });
});
