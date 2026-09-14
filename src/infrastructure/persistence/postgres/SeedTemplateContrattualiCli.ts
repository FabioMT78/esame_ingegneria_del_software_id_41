import { creaPoolPostgres } from "./PostgresPool";
import { caricaTemplateContrattuali } from "./SeedTemplateContrattuali";

async function main(): Promise<void> {
  const pool = creaPoolPostgres();
  const client = await pool.connect();

  try {
    const esito = await caricaTemplateContrattuali(client);
    process.stdout.write(
      `Template caricati: ${esito.tipologie} tipologie, ${esito.articoli} parti di articolo.\n`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((errore: unknown) => {
  const messaggio =
    errore instanceof Error
      ? (errore.stack ?? errore.message)
      : String(errore);

  process.stderr.write(`Seed template fallito: ${messaggio}\n`);
  process.exitCode = 1;
});
