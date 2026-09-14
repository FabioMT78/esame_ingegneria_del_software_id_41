import { readFile } from "node:fs/promises";
import path from "node:path";
import Articolo from "../../../src/domain/Articolo";
import Contratto from "../../../src/domain/Contratto";
import DatiCatastali from "../../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../../src/domain/Immobile";
import Indirizzo from "../../../src/domain/Indirizzo";
import Persona from "../../../src/domain/Persona";
import TipologiaContrattuale from "../../../src/domain/TipologiaContrattuale";
import GeneratoreDocumentoHtmlContratto from "../../../src/infrastructure/document/GeneratoreDocumentoHtmlContratto";

type ArticoloJson = {
  numArticolo: number;
  numParte: number;
  titolo: string;
  sottotitolo?: string;
  descrizione: string;
};

type TemplateJson = {
  denominazione: string;
  durata: number;
  rinnovo: number;
  articoli: ArticoloJson[];
};

async function caricaTemplate(nomeFile: string): Promise<TemplateJson> {
  const contenuto = await readFile(
    path.resolve(process.cwd(), "db/seed/template", nomeFile),
    "utf8",
  );

  return JSON.parse(contenuto) as TemplateJson;
}

function creaContratto(template: TemplateJson): Contratto {
  const tipologia = new TipologiaContrattuale({
    id: 1,
    denominazione: template.denominazione,
    durata: template.durata,
    rinnovo: template.rinnovo,
    articoli: template.articoli.map(
      (articolo) =>
        new Articolo({
          numArticolo: articolo.numArticolo,
          numParte: articolo.numParte,
          titolo: articolo.titolo,
          ...(articolo.sottotitolo !== undefined
            ? { sottotitolo: articolo.sottotitolo }
            : {}),
          descrizione: articolo.descrizione,
        }),
    ),
  });

  const proprietario = new Persona({
    nome: "Mario",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-10T00:00:00.000Z"),
    codiceFiscale: "RSSMRA80A10H501U",
    iban: "IT60X0542811101000000123456",
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Proprietario",
    }),
  });

  const inquilino = new Persona({
    nome: "Luigi",
    cognome: "Verdi",
    luogoNascita: "Milano",
    dataNascita: new Date("1990-02-20T00:00:00.000Z"),
    codiceFiscale: "VRDLGI90B20F205X",
    residenza: new Indirizzo({
      provincia: "MI",
      comune: "Milano",
      indirizzo: "Via Inquilino",
    }),
    documento: new DocumentoRiconoscimento({
      tipo: "carta d'identità",
      organoEmittente: "Comune di Milano",
      dataRilascio: new Date("2025-01-01T00:00:00.000Z"),
      dataScadenza: new Date("2035-01-01T00:00:00.000Z"),
      numero: "CA1234567",
    }),
  });

  return new Contratto({
    nomeDescrizione: "Contratto di prova",
    immobile: new Immobile({
      nome: "Casa Centro",
      indirizzo: new Indirizzo({
        provincia: "RM",
        comune: "Roma",
        indirizzo: "Via Casa",
        civico: "10",
      }),
      datiCatastali: new DatiCatastali({
        codiceComunale: "H501",
        foglio: 1,
        particella: 2,
        subalterno: 3,
        categoria: "A/2",
        consistenza: 5,
        rendita: 1000,
      }),
    }),
    proprietario,
    inquilino,
    tipologia,
    dal: new Date("2026-10-01T00:00:00.000Z"),
    al: Contratto.calcolaDataFine(
      new Date("2026-10-01T00:00:00.000Z"),
      tipologia,
    ),
    canoneMensile: 950.75,
    giornoPagamento: 5,
    registratoIl: new Date("2026-09-13T00:00:00.000Z"),
  });
}

describe("template contrattuali versionati", () => {
  test.each(["canone-concordato.json", "canone-libero.json"])(
    "%s usa soltanto placeholder supportati dal generatore",
    async (nomeFile) => {
      const template = await caricaTemplate(nomeFile);
      const generatore = new GeneratoreDocumentoHtmlContratto();

      const html = generatore.genera(creaContratto(template));

      expect(html).not.toContain("{{");
      expect(html).not.toContain("}}");
    },
  );
});
