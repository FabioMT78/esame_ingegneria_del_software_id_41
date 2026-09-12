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
