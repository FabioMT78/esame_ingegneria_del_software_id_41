import { creaApplicazioneProduzione } from "./compositionRoot";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new RangeError("PORT deve essere un numero compreso tra 1 e 65535");
}

const applicazione = creaApplicazioneProduzione();
const server = applicazione.app.listen(port, () => {
  console.log(`Gestionale Affitti listening on port ${port}`);
});

let arrestoInCorso = false;

function arresta(segnale: string): void {
  if (arrestoInCorso) {
    return;
  }

  arrestoInCorso = true;
  console.log(`Ricevuto ${segnale}: arresto del server`);

  server.close((erroreServer) => {
    void applicazione
      .chiudi()
      .then(() => {
        if (erroreServer !== undefined) {
          console.error("Errore durante l'arresto del server", erroreServer);
          process.exitCode = 1;
        }
      })
      .catch((errorePool: unknown) => {
        console.error(
          "Errore durante la chiusura del pool PostgreSQL",
          errorePool,
        );
        process.exitCode = 1;
      });
  });
}

process.once("SIGINT", () => arresta("SIGINT"));
process.once("SIGTERM", () => arresta("SIGTERM"));
