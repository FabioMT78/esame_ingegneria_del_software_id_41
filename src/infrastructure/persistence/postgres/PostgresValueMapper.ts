function dataToSql(data: Date): string {
  if (Number.isNaN(data.getTime())) {
    throw new TypeError("Data non valida");
  }

  const anno = data.getUTCFullYear().toString().padStart(4, "0");
  const mese = (data.getUTCMonth() + 1).toString().padStart(2, "0");
  const giorno = data.getUTCDate().toString().padStart(2, "0");

  return `${anno}-${mese}-${giorno}`;
}

function dataFromSql(valore: string): Date {
  const corrispondenza = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valore);

  if (corrispondenza === null) {
    throw new TypeError(`Data PostgreSQL non valida: ${valore}`);
  }

  const anno = Number(corrispondenza[1]);
  const mese = Number(corrispondenza[2]);
  const giorno = Number(corrispondenza[3]);
  const data = new Date(Date.UTC(anno, mese - 1, giorno));

  if (
    data.getUTCFullYear() !== anno ||
    data.getUTCMonth() !== mese - 1 ||
    data.getUTCDate() !== giorno
  ) {
    throw new TypeError(`Data PostgreSQL non valida: ${valore}`);
  }

  return data;
}

function numericFromSql(valore: string | number): number {
  const numero = typeof valore === "number" ? valore : Number(valore);

  if (!Number.isFinite(numero)) {
    throw new TypeError(`Valore NUMERIC PostgreSQL non valido: ${valore}`);
  }

  return numero;
}

export { dataFromSql, dataToSql, numericFromSql };
