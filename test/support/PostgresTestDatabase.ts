import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool, PoolClient } from "pg";
import { creaPoolPostgres } from "../../src/infrastructure/persistence/postgres/PostgresPool";

class PostgresTestDatabase {
  private constructor(
    private readonly pool: Pool,
    readonly client: PoolClient,
    readonly schemaName: string,
  ) {}

  static async crea(): Promise<PostgresTestDatabase> {
    const pool = creaPoolPostgres();
    const client = await pool.connect();
    const schemaName = `test_${process.pid}_${randomBytes(6).toString("hex")}`;
    let schemaCreato = false;

    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      schemaCreato = true;
      await client.query(`SET search_path TO "${schemaName}", public`);

      const migrationPath = path.resolve(
        process.cwd(),
        "db/migrations/001_initial_schema.sql",
      );
      const migrationSql = await readFile(migrationPath, "utf8");

      await client.query(migrationSql);

      return new PostgresTestDatabase(pool, client, schemaName);
    } catch (errore) {
      await client.query("ROLLBACK");

      if (schemaCreato) {
        await client.query("SET search_path TO public");
        await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      }

      client.release();
      await pool.end();
      throw errore;
    }
  }

  async reset(): Promise<void> {
    await this.client.query(`
      TRUNCATE TABLE
        pagamento,
        contratto,
        bozza_contratto,
        articolo,
        tipologia_contrattuale,
        documento_riconoscimento,
        persona,
        immobile,
        dati_catastali,
        indirizzo
      RESTART IDENTITY CASCADE
    `);
  }

  async chiudi(): Promise<void> {
    try {
      await this.client.query("SET search_path TO public");
      await this.client.query(`DROP SCHEMA "${this.schemaName}" CASCADE`);
    } finally {
      this.client.release();
      await this.pool.end();
    }
  }
}

export = PostgresTestDatabase;
