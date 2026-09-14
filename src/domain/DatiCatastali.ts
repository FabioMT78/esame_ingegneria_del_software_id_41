type DatiCatastaliParams = {
  id?: number;
  codiceComunale: string;
  foglio: number;
  particella: number;
  subalterno: number;
  categoria: string;
  consistenza: number;
  rendita: number;
};

function validaNonNegativo(nome: string, valore: number): void {
  if (valore < 0) {
    throw new RangeError(`${nome} non può essere negativo`);
  }
}

class DatiCatastali {
  id?: number;
  codiceComunale: string;
  foglio: number;
  particella: number;
  subalterno: number;
  categoria: string;
  consistenza: number;
  rendita: number;

  constructor({
    id,
    codiceComunale,
    foglio,
    particella,
    subalterno,
    categoria,
    consistenza,
    rendita,
  }: DatiCatastaliParams) {
    validaNonNegativo("Foglio", foglio);
    validaNonNegativo("Particella", particella);
    validaNonNegativo("Subalterno", subalterno);
    validaNonNegativo("Consistenza", consistenza);
    validaNonNegativo("Rendita", rendita);

    if (id !== undefined) {
      this.id = id;
    }

    this.codiceComunale = codiceComunale;
    this.foglio = foglio;
    this.particella = particella;
    this.subalterno = subalterno;
    this.categoria = categoria;
    this.consistenza = consistenza;
    this.rendita = rendita;
  }
}

export = DatiCatastali;
