const Contratto = require('../../src/domain/Contratto');

const tipologiaTriennale = {
  durata: 3,
};

function creaContratto(dal) {
  return new Contratto({
    dal: new Date(`${dal}T00:00:00.000Z`),
    tipologia: tipologiaTriennale,
  });
}

describe('Contratto.siSovrapponeA', () => {
  test('restituisce true quando i periodi si sovrappongono', () => {
    const contrattoEsistente = creaContratto('2026-06-01');
    const nuovoContratto = creaContratto('2027-01-01');

    expect(nuovoContratto.siSovrapponeA(contrattoEsistente)).toBe(true);
  });

  test('restituisce true quando un contratto inizia nel giorno finale dell’altro', () => {
    const contrattoEsistente = creaContratto('2026-06-01');
    const nuovoContratto = creaContratto('2029-05-31');

    expect(nuovoContratto.siSovrapponeA(contrattoEsistente)).toBe(true);
  });

  test('restituisce false quando un contratto inizia il giorno successivo alla fine dell’altro', () => {
    const contrattoEsistente = creaContratto('2026-06-01');
    const nuovoContratto = creaContratto('2029-06-01');

    expect(nuovoContratto.siSovrapponeA(contrattoEsistente)).toBe(false);
  });
});
