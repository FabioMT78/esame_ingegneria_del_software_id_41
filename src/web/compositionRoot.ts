import type { Express } from "express";
import RegistraContrattoService from "../application/RegistraContrattoService";
import GeneratoreDocumentoHtmlContratto from "../infrastructure/document/GeneratoreDocumentoHtmlContratto";
import PostgresBozzaContrattoRepository from "../infrastructure/persistence/postgres/PostgresBozzaContrattoRepository";
import PostgresContrattoRepository from "../infrastructure/persistence/postgres/PostgresContrattoRepository";
import PostgresImmobileRepository from "../infrastructure/persistence/postgres/PostgresImmobileRepository";
import PersonaRepositoryPostgres from "../infrastructure/persistence/postgres/PostgresPersonaRepository";
import { creaPoolPostgres } from "../infrastructure/persistence/postgres/PostgresPool";
import PostgresRegistrazioneContratto from "../infrastructure/persistence/postgres/PostgresRegistrazioneContratto";
import PostgresTipologiaContrattualeRepository from "../infrastructure/persistence/postgres/PostgresTipologiaContrattualeRepository";
import DataCorrenteSistemaProvider from "../infrastructure/time/DataCorrenteSistemaProvider";
import { creaApp } from "./app";

type ApplicazioneProduzione = {
  app: Express;
  chiudi(): Promise<void>;
};

function creaApplicazioneProduzione(): ApplicazioneProduzione {
  const pool = creaPoolPostgres();

  const bozzaRepository = new PostgresBozzaContrattoRepository(pool);
  const immobileRepository = new PostgresImmobileRepository(pool);
  const personaRepository = new PersonaRepositoryPostgres(pool);
  const tipologiaRepository =
    new PostgresTipologiaContrattualeRepository(pool);
  const contrattoRepository = new PostgresContrattoRepository(pool);
  const registrazioneContratto =
    new PostgresRegistrazioneContratto(pool);

  const registraContrattoService = new RegistraContrattoService(
    bozzaRepository,
    immobileRepository,
    personaRepository,
    tipologiaRepository,
    contrattoRepository,
    registrazioneContratto,
    new GeneratoreDocumentoHtmlContratto(),
    new DataCorrenteSistemaProvider(),
  );

  return {
    app: creaApp({ registraContrattoService }),
    async chiudi(): Promise<void> {
      await pool.end();
    },
  };
}

export { creaApplicazioneProduzione };
export type { ApplicazioneProduzione };
