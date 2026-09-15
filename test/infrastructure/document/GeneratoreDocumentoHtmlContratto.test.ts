import Articolo from "../../../src/domain/Articolo";
import Contratto from "../../../src/domain/Contratto";
import DatiCatastali from "../../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../../src/domain/Immobile";
import Indirizzo from "../../../src/domain/Indirizzo";
import Persona from "../../../src/domain/Persona";
import TipologiaContrattuale from "../../../src/domain/TipologiaContrattuale";
import GeneratoreDocumentoHtmlContratto from "../../../src/infrastructure/document/GeneratoreDocumentoHtmlContratto";

function creaContratto(articoli: Articolo[]): Contratto {
  const proprietario = new Persona({
    nome: "Mario <Admin>",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date(Date.UTC(1980, 0, 10)),
    codiceFiscale: "RSSMRA80A10H501U",
    iban: "it 60 x054 2811 1010 0000 0123 456",
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Proprietario",
      civico: "1",
    }),
  });

  const inquilino = new Persona({
    nome: "Luigi & Figli",
    cognome: "Verdi",
    luogoNascita: "Milano",
    dataNascita: new Date(Date.UTC(1990, 1, 20)),
    codiceFiscale: "VRDLGI90B20F205X",
    residenza: new Indirizzo({
      provincia: "MI",
      comune: "Milano",
      indirizzo: "Via Inquilino",
      civico: "2",
    }),
    documento: new DocumentoRiconoscimento({
      tipo: "carta d'identità",
      organoEmittente: "Comune <Milano>",
      dataRilascio: new Date(Date.UTC(2024, 0, 1)),
      dataScadenza: new Date(Date.UTC(2034, 0, 1)),
      numero: 'CA&"123"',
    }),
  });

  const immobile = new Immobile({
    nome: "Casa Centro",
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      cap: "00100",
      indirizzo: "Via delle Rose",
      civico: "10",
      interno: "3",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 12,
      particella: 345,
      subalterno: 7,
      categoria: "A/2",
      consistenza: 5.5,
      rendita: 987.65,
    }),
  });

  return new Contratto({
    nomeDescrizione: "Contratto <Centro>",
    immobile,
    proprietario,
    inquilino,
    tipologia: new TipologiaContrattuale({
      id: 1,
      denominazione: "Canone concordato",
      durata: 3,
      rinnovo: 2,
      articoli,
    }),
    dal: new Date(Date.UTC(2026, 5, 15)),
    al: new Date(Date.UTC(2029, 5, 14)),
    canoneMensile: 950.5,
    giornoPagamento: 15,
    registratoIl: new Date(Date.UTC(2026, 4, 20)),
  });
}

describe("GeneratoreDocumentoHtmlContratto", () => {
  test("ordina articoli e parti e sostituisce i placeholder", () => {
    const generatore = new GeneratoreDocumentoHtmlContratto();
    const contratto = creaContratto([
      new Articolo({
        numArticolo: 2,
        numParte: 0,
        titolo: "Durata",
        descrizione:
          "Decorrenza {{contratto.dal}} - {{contratto.al}}.",
      }),
      new Articolo({
        numArticolo: 1,
        numParte: 1,
        titolo: "Canone",
        sottotitolo: "Pagamento",
        descrizione:
          " Pagamento entro il giorno {{contratto.giornoPagamento}}.",
      }),
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Canone",
        descrizione:
          "Il canone è euro {{contratto.canoneMensile}}.",
      }),
    ]);

    const html = generatore.genera(contratto);

    expect(html.indexOf('data-num-articolo="1"')).toBeLessThan(
      html.indexOf('data-num-articolo="2"'),
    );
    expect(html.indexOf("Il canone è euro 950,50.")).toBeLessThan(
      html.indexOf("Pagamento entro il giorno 15."),
    );
    expect(html).toContain("Decorrenza 2026-06-15 - 2029-06-14.");
  });

  test("escape i valori dinamici prima di inserirli nell'HTML", () => {
    const generatore = new GeneratoreDocumentoHtmlContratto();
    const contratto = creaContratto([
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Soggetti",
        descrizione:
          "{{proprietario.nome}} / {{inquilino.nome}} / {{inquilino.documento.numero}} / {{inquilino.documento.organoEmittente}}",
      }),
    ]);

    const html = generatore.genera(contratto);

    expect(html).toContain("Mario &lt;Admin&gt;");
    expect(html).toContain("Luigi &amp; Figli");
    expect(html).toContain("CA&amp;&quot;123&quot;");
    expect(html).toContain("Comune &lt;Milano&gt;");
    expect(html).not.toContain("<Admin>");
    expect(html).not.toContain("<Milano>");
  });

  test("renderizza valori derivati, importi in lettere e IBAN del proprietario", () => {
    const generatore = new GeneratoreDocumentoHtmlContratto();
    const contratto = creaContratto([
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Valori",
        descrizione:
          "Annuo {{contratto.canoneAnnuale}} ({{contratto.canoneAnnualeText}}/00). " +
          "Mensile {{contratto.canoneMensile}} ({{contratto.canoneMensileText}}/00). " +
          "Deposito {{contratto.depositoCauzionale}},00 ({{contratto.depositoCauzionaleText}}/00). " +
          "IBAN {{proprietario.iban}}.",
      }),
    ]);

    const html = generatore.genera(contratto);

    expect(html).toContain("Annuo 11406,00 (undicimilaquattrocentosei/00)");
    expect(html).toContain("Mensile 950,50 (novecentocinquanta/50)");
    expect(html).toContain("Deposito 2851,50 (duemilaottocentocinquantuno/50)");
    expect(html).toContain("IBAN IT60X0542811101000000123456");
  });

  test("se il template richiede l'IBAN rifiuta un proprietario che non lo possiede", () => {
    const generatore = new GeneratoreDocumentoHtmlContratto();
    const contratto = creaContratto([
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Pagamento",
        descrizione: "IBAN {{proprietario.iban}}",
      }),
    ]);

    delete contratto.proprietario.iban;

    expect(() => generatore.genera(contratto)).toThrow(
      "IBAN del proprietario obbligatorio per il template selezionato",
    );
  });

  test("rifiuta placeholder non supportati", () => {
    const generatore = new GeneratoreDocumentoHtmlContratto();
    const contratto = creaContratto([
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Errore",
        descrizione: "Valore {{campo.sconosciuto}}",
      }),
    ]);

    expect(() => generatore.genera(contratto)).toThrow(
      "Placeholder non supportato: {{campo.sconosciuto}}",
    );
  });

  test("rifiuta una tipologia che risulta priva di articoli al momento della generazione", () => {
    const generatore = new GeneratoreDocumentoHtmlContratto();
    const contratto = creaContratto([
      new Articolo({
        numArticolo: 1,
        numParte: 0,
        titolo: "Articolo test",
        descrizione: "Testo",
      }),
    ]);

    contratto.tipologia.articoli.length = 0;

    expect(() => generatore.genera(contratto)).toThrow(
      "La tipologia contrattuale non contiene articoli da generare",
    );
  });
});
