/**
 * Fornisce la data di calendario autorevole del server.
 * La porta rende deterministiche le regole temporali nei test applicativi.
 */
interface DataCorrenteProvider {
  oggi(): Date;
}

export = DataCorrenteProvider;
