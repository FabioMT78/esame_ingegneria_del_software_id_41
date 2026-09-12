import DocumentoRiconoscimento from "../../src/domain/DocumentoRiconoscimento";
import Indirizzo from "../../src/domain/Indirizzo";
import Persona from "../../src/domain/Persona";

describe("Persona", () => {
  test("consente di aggiornare i dati modificabili mantenendo invariati id e codice fiscale", () => {
    const residenzaIniziale = new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Vecchia",
    });
    const persona = new Persona({
      id: 7,
      nome: "Mario",
      cognome: "Rossi",
      luogoNascita: "Roma",
      dataNascita: new Date("1980-01-10T00:00:00.000Z"),
      codiceFiscale: "RSSMRA80A10H501U",
      residenza: residenzaIniziale,
    });

    persona.aggiornaDatiAnagrafici(
      "Mario",
      "Rossi",
      "Milano",
      new Date("1980-01-10T00:00:00.000Z"),
    );

    const nuovaResidenza = new Indirizzo({
      provincia: "MI",
      comune: "Milano",
      indirizzo: "Via Nuova",
    });
    persona.cambiaResidenza(nuovaResidenza);

    const documento = new DocumentoRiconoscimento({
      tipo: "carta d'identità",
      organoEmittente: "Comune di Milano",
      dataRilascio: new Date("2025-01-01T00:00:00.000Z"),
      dataScadenza: new Date("2035-01-01T00:00:00.000Z"),
      numero: "CA1234567",
    });
    persona.impostaDocumentoRiconoscimento(documento);

    expect(persona.id).toBe(7);
    expect(persona.codiceFiscale).toBe("RSSMRA80A10H501U");
    expect(persona.luogoNascita).toBe("Milano");
    expect(persona.residenza).toBe(nuovaResidenza);
    expect(persona.documento).toBe(documento);
  });
});
