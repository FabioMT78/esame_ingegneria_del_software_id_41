import Contratto from "../../src/domain/Contratto";

const canoneConcordato = {
  durata: 3,
  rinnovo: 2,
};

const canoneLibero = {
  durata: 4,
  rinnovo: 4,
};

type CreaContrattoOptions = {
  tipologia?: {
    durata: number;
    rinnovo: number;
  };
  canoneMensile?: number;
  giornoPagamento?: number;
};

function creaContratto(
  dal: string,
  {
    tipologia = canoneConcordato,
    canoneMensile = 1000,
    giornoPagamento = 15,
  }: CreaContrattoOptions = {},
): Contratto {
  return new Contratto({
    dal: new Date(`${dal}T00:00:00.000Z`),
    tipologia,
    canoneMensile,
    giornoPagamento,
  });
}


describe("Contratto.al", () => {
  test("deriva la data finale dalla durata triennale meno un giorno", () => {
    const contratto = creaContratto("2026-06-01");

    expect(contratto.al).toEqual(new Date("2029-05-31T00:00:00.000Z"));
  });

  test("deriva la data finale dalla durata quadriennale meno un giorno", () => {
    const contratto = creaContratto("2026-06-01", {
      tipologia: canoneLibero,
    });

    expect(contratto.al).toEqual(new Date("2030-05-31T00:00:00.000Z"));
  });
});

describe("Contratto.siSovrapponeA", () => {
  test("restituisce true quando i periodi si sovrappongono", () => {
    const contrattoEsistente = creaContratto("2026-06-01");
    const nuovoContratto = creaContratto("2027-01-01");

    expect(nuovoContratto.siSovrapponeA(contrattoEsistente)).toBe(true);
  });

  test("restituisce true quando un contratto inizia nel giorno finale dell’altro", () => {
    const contrattoEsistente = creaContratto("2026-06-01");
    const nuovoContratto = creaContratto("2029-05-31");

    expect(nuovoContratto.siSovrapponeA(contrattoEsistente)).toBe(true);
  });

  test("restituisce false quando un contratto inizia il giorno successivo alla fine dell’altro", () => {
    const contrattoEsistente = creaContratto("2026-06-01");
    const nuovoContratto = creaContratto("2029-06-01");

    expect(nuovoContratto.siSovrapponeA(contrattoEsistente)).toBe(false);
  });
});

describe("Contratto.giornoPagamento", () => {
  test.each([1, 28])("accetta il valore limite %i", (giornoPagamento) => {
    expect(() =>
      creaContratto("2026-06-01", { giornoPagamento }),
    ).not.toThrow();
  });

  test.each([0, 29])("rifiuta il valore fuori limite %i", (giornoPagamento) => {
    expect(() => creaContratto("2026-06-01", { giornoPagamento })).toThrow(
      RangeError,
    );
  });
});

describe("Contratto.calcolaImportoCompetenza", () => {
  test("calcola il pro-rata della prima mensilità quando il contratto inizia a mese già iniziato", () => {
    const contratto = creaContratto("2026-06-15", {
      canoneMensile: 1000,
    });

    expect(contratto.calcolaImportoCompetenza(2026, 6)).toBe(533.33);
  });

  test("restituisce il canone completo per la prima mensilità quando il contratto inizia il primo giorno del mese", () => {
    const contratto = creaContratto("2026-06-01", {
      canoneMensile: 1000,
    });

    expect(contratto.calcolaImportoCompetenza(2026, 6)).toBe(1000);
  });

  test("restituisce il canone completo per una mensilità interamente compresa nel contratto", () => {
    const contratto = creaContratto("2026-06-15", {
      canoneMensile: 1000,
    });

    expect(contratto.calcolaImportoCompetenza(2026, 7)).toBe(1000);
  });

  test("calcola il pro-rata dell'ultima mensilità quando il contratto termina a mese già iniziato", () => {
    const contratto = creaContratto("2026-06-15", {
      canoneMensile: 1000,
    });

    /*
     * Contratto triennale:
     * dal 15/06/2026
     * al  14/06/2029
     *
     * giugno 2029:
     * 1000 * 14 / 30 = 466,666...
     */
    expect(contratto.calcolaImportoCompetenza(2029, 6)).toBe(466.67);
  });

  test("restituisce il canone completo per l'ultima mensilità quando il contratto termina l'ultimo giorno del mese", () => {
    const contratto = creaContratto("2026-06-01", {
      canoneMensile: 1000,
    });

    /*
     * dal 01/06/2026
     * al  31/05/2029
     */
    expect(contratto.calcolaImportoCompetenza(2029, 5)).toBe(1000);
  });

  test("rifiuta una competenza precedente all'inizio del contratto", () => {
    const contratto = creaContratto("2026-06-15");

    expect(() => contratto.calcolaImportoCompetenza(2026, 5)).toThrow(
      RangeError,
    );
  });

  test("rifiuta una competenza successiva alla fine del contratto", () => {
    const contratto = creaContratto("2026-06-15");

    expect(() => contratto.calcolaImportoCompetenza(2029, 7)).toThrow(
      RangeError,
    );
  });

  test("rifiuta una competenza appartenente a un anno precedente al contratto", () => {
    const contratto = creaContratto("2026-06-15");

    expect(() => contratto.calcolaImportoCompetenza(2025, 12)).toThrow(
      RangeError,
    );
  });

  test("rifiuta una competenza appartenente a un anno successivo al contratto", () => {
    const contratto = creaContratto("2026-06-15");

    expect(() => contratto.calcolaImportoCompetenza(2030, 1)).toThrow(
      RangeError,
    );
  });

  test.each([0, 13])("rifiuta il mese di competenza non valido %i", (mese) => {
    const contratto = creaContratto("2026-06-15");

    expect(() => contratto.calcolaImportoCompetenza(2027, mese)).toThrow(
      RangeError,
    );
  });
});
