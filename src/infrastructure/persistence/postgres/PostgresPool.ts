import { Pool } from "pg";
import { creaConfigurazionePostgres } from "./PostgresConfig";

function creaPoolPostgres(): Pool {
  return new Pool(creaConfigurazionePostgres());
}

export { creaPoolPostgres };
