import type { PoolConfig } from "pg";

function leggiVariabileObbligatoria(
  nome: string,
  env: NodeJS.ProcessEnv,
): string {
  const valore = env[nome]?.trim();

  if (valore === undefined || valore.length === 0) {
    throw new Error(`Variabile d'ambiente ${nome} non configurata`);
  }

  return valore;
}

function leggiPorta(env: NodeJS.ProcessEnv): number {
  const valore = leggiVariabileObbligatoria("DB_PORT", env);
  const porta = Number(valore);

  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error("Variabile d'ambiente DB_PORT non valida");
  }

  return porta;
}

function creaConfigurazionePostgres(
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  return {
    host: leggiVariabileObbligatoria("DB_HOST", env),
    port: leggiPorta(env),
    database: leggiVariabileObbligatoria("POSTGRES_DB", env),
    user: leggiVariabileObbligatoria("POSTGRES_USER", env),
    password: leggiVariabileObbligatoria("POSTGRES_PASSWORD", env),
  };
}

export { creaConfigurazionePostgres };
