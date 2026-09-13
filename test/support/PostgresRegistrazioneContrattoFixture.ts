import type { PoolClient } from "pg";
import Articolo from "../../src/domain/Articolo";
import Contratto from "../../src/domain/Contratto";
import DatiCatastali from "../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Pagamento from "../../src/domain/Pagamento";
import Persona from "../../src/domain/Persona";
import TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";

async function creaTipologiaPersistita(
  client: PoolClient,
): Promise<TipologiaContrattuale> {
  const tipologiaResult = await client.query<{ id: number }>(`
    INSERT INTO tipologia_contrattuale (denominazione, durata, rinnovo)
    VALUES ('Canone concordato registrazione', 3, 2)
    RETURNING id
  `);

  const tipologiaId = tipologiaResult.rows[0]?.id;

  if (tipologiaId === undefined) {
    throw new Error("Fixture tipologia non creata");
  }

  const articoloResult = await client.query<{ id: number }>(
    `
      INSERT INTO articolo (
        tipologia_id,
        num_articolo,
        num_parte,
        titolo,
        sottotitolo,
        descrizione
      )
      VALUES ($1, 1, 0, 'Oggetto', NULL, 'Testo articolo')
      RETURNING id
    `,
    [tipologiaId],
  );

  const articoloId = articoloResult.rows[0]?.id;

  if (articoloId === undefined) {
    throw new Error("Fixture articolo non creato");
  }

  return new TipologiaContrattuale({
    id: tipologiaId,
    denominazione: "Canone concordato registrazione",
    durata: 3,
    rinnovo: 2,
    articoli: [
      new Articolo({
        id: articoloId,
        numArticolo: 1,
        numParte: 0,
        titolo: "Oggetto",
        descrizione: "Testo articolo",
      }),
    ],
  });
}

function creaContrattoNuovo(
  tipologia: TipologiaContrattuale,
  opzioni: {
    contenuto?: string;
    aggiungiPagamento?: boolean;
    importoPagamento?: number;
  } = {},
): Contratto {
  const immobile = new Immobile({
    nome: "Casa nuova",
    indirizzo: new Indirizzo({
      nazione: "Italia",
      provincia: "RM",
      comune: "Roma",
      cap: "00100",
      indirizzo: "Via Nuova",
      civico: "10",
      interno: "2",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 50,
      particella: 600,
      subalterno: 8,
      categoria: "A/2",
      consistenza: 5.5,
      rendita: 1234.56,
    }),
  });

  const proprietario = new Persona({
    nome: "Mario",
    cognome: "Proprietario",
    luogoNascita: "Roma",
    dataNascita: new Date(Date.UTC(1975, 3, 10)),
    codiceFiscale: "PRPMRA75D10H501Z",
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via del Proprietario",
      civico: "5",
    }),
  });

  const inquilino = new Persona({
    nome: "Luca",
    cognome: "Inquilino",
    luogoNascita: "Milano",
    dataNascita: new Date(Date.UTC(1992, 7, 20)),
    codiceFiscale: "NQLLCU92M20F205X",
    residenza: new Indirizzo({
      provincia: "MI",
      comune: "Milano",
      indirizzo: "Via dell'Inquilino",
      civico: "7",
    }),
    documento: new DocumentoRiconoscimento({
      tipo: "carta d'identità",
      organoEmittente: "Comune di Milano",
      dataRilascio: new Date(Date.UTC(2025, 0, 10)),
      dataScadenza: new Date(Date.UTC(2035, 0, 10)),
      numero: "CA1234567",
    }),
  });

  const contratto = new Contratto({
    nomeDescrizione: "Contratto nuova registrazione",
    immobile,
    proprietario,
    inquilino,
    tipologia,
    dal: new Date(Date.UTC(2026, 8, 15)),
    al: new Date(Date.UTC(2029, 8, 14)),
    canoneMensile: 900,
    giornoPagamento: 10,
    registratoIl: new Date(Date.UTC(2026, 8, 13)),
  });

  if (opzioni.contenuto !== undefined) {
    contratto.impostaContenuto(opzioni.contenuto);
  } else {
    contratto.impostaContenuto("<article>Contratto definitivo</article>");
  }

  if (opzioni.aggiungiPagamento !== false) {
    contratto.aggiungiPagamento(
      new Pagamento({
        annoCompetenza: 2026,
        meseCompetenza: 9,
        dataPagamento: new Date(Date.UTC(2026, 8, 15)),
        importo: opzioni.importoPagamento ?? 480,
      }),
    );
  }

  return contratto;
}

export { creaContrattoNuovo, creaTipologiaPersistita };
