import Articolo from "../../src/domain/Articolo";
import Contratto from "../../src/domain/Contratto";
import DatiCatastali from "../../src/domain/DatiCatastali";
import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Pagamento from "../../src/domain/Pagamento";
import Persona from "../../src/domain/Persona";
import TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";

function creaTipologia(
  durata = 3,
  rinnovo = 2,
): TipologiaContrattuale {
  return new TipologiaContrattuale({
    id: durata,
    denominazione: `Tipologia ${durata}+${rinnovo}`,
    durata,
    rinnovo,
    articoli: [
      new Articolo({
        id: 1,
        numArticolo: 1,
        numParte: 0,
        titolo: "Articolo 1",
        descrizione: "Testo",
      }),
    ],
  });
}

function creaImmobile(): Immobile {
  return new Immobile({
    id: 1,
    nome: "Casa Roma",
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Esempio",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 1,
      particella: 10,
      subalterno: 1,
      categoria: "A/2",
      consistenza: 5,
      rendita: 1000,
    }),
  });
}

function creaPersona(
  codiceFiscale: string,
  conDocumento = false,
): Persona {
  const persona = new Persona({
    nome: "Mario",
    cognome: "Rossi",
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-10T00:00:00.000Z"),
    codiceFiscale,
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Residenza",
    }),
  });

  if (conDocumento) {
    persona.impostaDocumentoRiconoscimento(
      new DocumentoRiconoscimento({
        tipo: "carta d'identità",
        organoEmittente: "Comune di Roma",
        dataRilascio: new Date("2024-01-01T00:00:00.000Z"),
        dataScadenza: new Date("2034-01-01T00:00:00.000Z"),
        numero: "CA1234567",
      }),
    );
  }

  return persona;
}

type CreaContrattoOptions = {
  tipologia?: TipologiaContrattuale;
  al?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;
};

function creaContratto(
  dal: string,
  {
    tipologia = creaTipologia(),
    al,
    canoneMensile = 1000,
    giornoPagamento = 15,
  }: CreaContrattoOptions = {},
): Contratto {
  const dataDal = new Date(`${dal}T00:00:00.000Z`);
  const dataAl = al ?? Contratto.calcolaDataFine(dataDal, tipologia);

  return new Contratto({
    nomeDescrizione: "Contratto test",
    immobile: creaImmobile(),
    proprietario: creaPersona("RSSMRA80A10H501U"),
    inquilino: creaPersona("VRDLGI90B20H501X", true),
    tipologia,
    dal: dataDal,
    al: dataAl,
    canoneMensile,
    giornoPagamento,
    registratoIl: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("Contratto.al", () => {
  test("conserva la data finale esplicita come parte del periodo storico", () => {
    const al = new Date("2029-05-31T00:00:00.000Z");
    const contratto = creaContratto("2026-06-01", {
      tipologia: creaTipologia(4, 4),
      al,
    });

    expect(contratto.al).toEqual(al);
    expect(contratto.al).not.toBe(al);
  });

  test("rifiuta una data finale precedente alla data iniziale", () => {
    expect(() =>
      creaContratto("2026-06-01", {
        al: new Date("2026-05-31T00:00:00.000Z"),
      }),
    ).toThrow(RangeError);
  });
});

describe("Contratto.calcolaDataFine", () => {
  test("calcola la data finale triennale meno un giorno senza modificare dal", () => {
    const dal = new Date("2026-06-15T00:00:00.000Z");
    const originale = new Date(dal.getTime());

    expect(Contratto.calcolaDataFine(dal, creaTipologia())).toEqual(
      new Date("2029-06-14T00:00:00.000Z"),
    );
    expect(dal).toEqual(originale);
  });

  test("calcola la data finale quadriennale meno un giorno", () => {
    const dal = new Date("2026-06-01T00:00:00.000Z");

    expect(Contratto.calcolaDataFine(dal, creaTipologia(4, 4))).toEqual(
      new Date("2030-05-31T00:00:00.000Z"),
    );
  });
});

describe("Contratto.periodiSiSovrappongono", () => {
  test("considera sovrapposti due periodi che condividono il giorno di confine", () => {
    expect(
      Contratto.periodiSiSovrappongono(
        new Date("2029-05-31T00:00:00.000Z"),
        new Date("2032-05-30T00:00:00.000Z"),
        new Date("2026-06-01T00:00:00.000Z"),
        new Date("2029-05-31T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  test("non considera sovrapposti periodi separati da almeno un giorno", () => {
    expect(
      Contratto.periodiSiSovrappongono(
        new Date("2029-06-01T00:00:00.000Z"),
        new Date("2032-05-31T00:00:00.000Z"),
        new Date("2026-06-01T00:00:00.000Z"),
        new Date("2029-05-31T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("Contratto.siSovrapponeA", () => {
  test("delega la regola di sovrapposizione ai periodi inclusivi memorizzati", () => {
    const esistente = creaContratto("2026-06-01");
    const sovrapposto = creaContratto("2029-05-31");
    const successivo = creaContratto("2029-06-01");

    expect(sovrapposto.siSovrapponeA(esistente)).toBe(true);
    expect(successivo.siSovrapponeA(esistente)).toBe(false);
  });
});

describe("Contratto.giornoPagamento", () => {
  test.each([1, 28])("accetta il valore limite %i", (giornoPagamento) => {
    expect(() =>
      creaContratto("2026-06-01", { giornoPagamento }),
    ).not.toThrow();
  });

  test.each([0, 29])("rifiuta il valore fuori limite %i", (giornoPagamento) => {
    expect(() =>
      creaContratto("2026-06-01", { giornoPagamento }),
    ).toThrow(RangeError);
  });
});

describe("Contratto.calcolaImportoCompetenza", () => {
  test("calcola il pro-rata della prima mensilità", () => {
    const contratto = creaContratto("2026-06-15", {
      canoneMensile: 1000,
    });

    expect(contratto.calcolaImportoCompetenza(2026, 6)).toBe(533.33);
  });

  test("restituisce il canone completo quando la prima mensilità inizia il primo giorno", () => {
    const contratto = creaContratto("2026-06-01", {
      canoneMensile: 1000,
    });

    expect(contratto.calcolaImportoCompetenza(2026, 6)).toBe(1000);
  });

  test("restituisce il canone completo per una mensilità intermedia", () => {
    const contratto = creaContratto("2026-06-15", {
      canoneMensile: 1000,
    });

    expect(contratto.calcolaImportoCompetenza(2026, 7)).toBe(1000);
  });

  test("calcola il pro-rata dell'ultima mensilità usando al memorizzato", () => {
    const contratto = creaContratto("2026-06-15", {
      canoneMensile: 1000,
    });

    expect(contratto.calcolaImportoCompetenza(2029, 6)).toBe(466.67);
  });

  test("rifiuta competenze fuori dal periodo o mesi non validi", () => {
    const contratto = creaContratto("2026-06-15");

    expect(() => contratto.calcolaImportoCompetenza(2026, 5)).toThrow(
      RangeError,
    );
    expect(() => contratto.calcolaImportoCompetenza(2029, 7)).toThrow(
      RangeError,
    );
    expect(() => contratto.calcolaImportoCompetenza(2027, 13)).toThrow(
      RangeError,
    );
  });
});

describe("Contratto contenuto e pagamenti", () => {
  test("conserva il contenuto storico assegnato", () => {
    const contratto = creaContratto("2026-06-01");

    contratto.impostaContenuto("<article>Contratto</article>");

    expect(contratto.contenuto).toBe("<article>Contratto</article>");
  });

  test("impedisce due pagamenti per la stessa competenza", () => {
    const contratto = creaContratto("2026-06-01");
    const primo = new Pagamento({
      annoCompetenza: 2026,
      meseCompetenza: 6,
      dataPagamento: new Date("2026-06-01T00:00:00.000Z"),
      importo: 1000,
    });
    const duplicato = new Pagamento({
      annoCompetenza: 2026,
      meseCompetenza: 6,
      dataPagamento: new Date("2026-06-02T00:00:00.000Z"),
      importo: 1000,
    });

    contratto.aggiungiPagamento(primo);

    expect(() => contratto.aggiungiPagamento(duplicato)).toThrow(
      "Esiste già un pagamento per la competenza indicata",
    );
  });
});
