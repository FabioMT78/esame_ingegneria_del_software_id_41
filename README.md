# Gestionale Affitti

Gestionale Affitti è un'applicazione web per la gestione essenziale di locazioni immobiliari ad uso abitativo.

La versione `1.0` è focalizzata su due casi d'uso principali end-to-end:

- **UC-01 — Registrare un contratto di locazione**: il proprietario registra un contratto relativo all'intero immobile mediante una procedura guidata, con validazione progressiva dei dati e controlli di coerenza.
- **UC-02 — Registrare il pagamento di un canone**: il proprietario individua il contratto e registra il pagamento completo della prima mensilità non ancora pagata.

Il progetto privilegia uno scope contenuto, la testabilità, la chiarezza delle responsabilità e la tracciabilità rispetto al numero di funzionalità.

La specifica completa dello scope, delle user stories, dei requisiti funzionali e non funzionali e degli acceptance criteria è disponibile in [`docs/requisiti.tex`](docs/requisiti.tex). Le decisioni di modellazione sono documentate in [`docs/modellazione.md`](docs/modellazione.md); architettura, responsabilità e decisioni di design sono descritte in [`docs/architettura.md`](docs/architettura.md).

## Quickstart

### Prerequisiti

Per eseguire il progetto sono necessari:

- Git;
- Docker con Docker Compose;
- accesso al repository GitHub privato del progetto.

Non è necessario installare Node.js o PostgreSQL direttamente sull'host: l'ambiente di riferimento è eseguito tramite Docker.

### Installazione e setup del progetto

Nei comandi seguenti le espressioni racchiuse tra parentesi quadre, come `[NOME_CARTELLA_PROGETTO]`, sono segnaposto da sostituire con un valore reale.

#### 1. Clonare il repository

Dalla cartella nella quale si vuole creare il progetto, eseguire:

```bash
git clone https://github.com/FabioMT78/ingsw_25-26_group-41.git ./[NOME_CARTELLA_PROGETTO]
```

Entrare quindi nella cartella del progetto:

```bash
cd [NOME_CARTELLA_PROGETTO]
```

#### 2. Configurare le variabili d'ambiente

Creare il file locale di configurazione copiando il template:

```bash
cp docker/.env.example docker/.env
```

Personalizzare i valori presenti in `docker/.env` quando necessario.

`docker/.env` contiene la configurazione locale e non deve essere versionato; `docker/.env.example` rimane nel repository come template riproducibile.

#### 3. Scaricare le immagini Docker

```bash
docker compose --env-file docker/.env -f docker/compose.yaml pull
```

Le immagini di riferimento sono:

```text
node:24.21.0-alpine3.24
postgres:16.15-alpine3.24
```

#### 4. Inizializzare lo schema PostgreSQL

Avviare PostgreSQL e attendere che sia pronto:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/compose.yaml \
  up -d --wait db
```

Applicare la migration iniziale al database di sviluppo:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/compose.yaml \
  exec -T db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < db/migrations/001_initial_schema.sql
```

La migration iniziale è versionata e deve essere applicata una sola volta a un database vuoto. I test di integrazione non riutilizzano né svuotano lo schema di sviluppo: creano uno schema temporaneo isolato, applicano la stessa migration e lo eliminano al termine.

## Avvio dell'applicazione

Avviare i servizi:

```bash
docker compose --env-file docker/.env -f docker/compose.yaml up
```

Il container applicativo esegue `npm run dev`; PostgreSQL viene avviato come dipendenza e deve raggiungere lo stato `healthy`.

In un secondo terminale verificare il bootstrap HTTP:

```bash
curl http://localhost:3000/health
```

Risultato atteso:

```json
{"status":"ok"}
```

Per arrestare i servizi:

```bash
docker compose --env-file docker/.env -f docker/compose.yaml down
```

## Verifica del progetto

Il comando applicativo canonico di verifica è:

```bash
npm run verify
```

Esegue, nell'ordine:

```text
build
→ type-check di sorgenti e test
→ lint
→ test unitari e di integrazione
```

I test di integrazione PostgreSQL richiedono un database raggiungibile tramite le variabili definite in `docker/.env`. Dall'host avviare prima il database:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/compose.yaml \
  up -d --wait db
```

Quindi eseguire il quality gate nel container applicativo:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/compose.yaml \
  run --rm --no-deps app \
  npm run verify
```

Per una verifica riproducibile a partire dal `package-lock.json`, equivalente al setup usato dalla CI:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/compose.yaml \
  run --rm --no-deps app \
  sh -c "npm ci && npm run verify"
```

## Usage

La versione `1.0` è utilizzata dal **proprietario**, unico attore che interagisce direttamente con il sistema.

I due flussi principali sono:

1. registrazione di un nuovo contratto di locazione relativo all'intero immobile;
2. registrazione del pagamento mensile del canone relativo a un contratto esistente.

La versione `1.0` non gestisce, tra le altre funzionalità, autenticazione e autorizzazione, locazione parziale, rinnovi contrattuali, pagamenti parziali, trasferimenti bancari reali, firma o registrazione fiscale del contratto.

Per i dettagli comportamentali e i criteri di accettazione fare riferimento a [`docs/requisiti.tex`](docs/requisiti.tex).

## Configurazione

Lo stack applicativo usa:

- Node.js 24 LTS;
- TypeScript in modalità strict per backend e test;
- Express.js per il backend;
- sintassi `import`/`export` nei sorgenti TypeScript e output CommonJS per il runtime Node.js;
- `tsc` per la compilazione;
- `tsx` per esecuzione e watch in sviluppo;
- ESLint per l'analisi statica di backend, test e JavaScript del frontend;
- Jest con `ts-jest` per i test;
- npm e `package-lock.json` per la gestione riproducibile delle dipendenze;
- HTML5, CSS e JavaScript vanilla per il frontend;
- PostgreSQL 16;
- `pg` come driver SQL;
- JSONB per la bozza di UC-01;
- HTML persistito come `TEXT` per il contenuto storico del contratto;
- Docker Compose con container separati per applicazione e database.

La configurazione Docker è mantenuta nella cartella `docker/`. Il file `docker/.env.example` documenta le variabili richieste, mentre `docker/.env` contiene i valori locali e non viene versionato.

Le date che rappresentano giorni di calendario sono persistite come PostgreSQL `DATE`. Il backend le tratta come date civili e non come istanti temporali; eventuali timestamp tecnici introdotti in seguito useranno `TIMESTAMPTZ`.

## Struttura del progetto

La struttura fisica segue i boundary definiti dall'architettura e viene materializzata quando compaiono file con una responsabilità reale:

```text
src/
  web/
  application/
    model/
    ports/
  domain/
  infrastructure/
    persistence/
      postgres/
    document/
    time/
    logging/

public/
  css/
  js/

db/
  migrations/
  seed/

test/
  integration/
  support/
docs/
uml/
docker/
```

Le directory vuote non vengono mantenute artificialmente con file placeholder: vengono versionate quando contengono il primo artefatto necessario.

## Test

Jest, con `ts-jest`, è il framework usato per unit test e test di integrazione. I test del backend sono scritti in TypeScript e vengono sottoposti a type-check dedicato prima dell'esecuzione.

Gli unit test della business logic restano indipendenti e deterministici. I test che dipendono realmente da PostgreSQL usano il database configurato per l'ambiente soltanto come server: per ogni suite viene creato uno schema temporaneo con nome controllato, viene applicata la migration versionata e lo schema viene eliminato al termine. Lo schema di sviluppo non viene troncato o riutilizzato come fixture di test.

Il comando per eseguire tutti i test è:

```bash
npm test
```

Dall'host, con PostgreSQL già avviato e `healthy`:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/compose.yaml \
  run --rm --no-deps app \
  npm test
```

## Continuous Integration

Il repository usa GitHub Actions per la Continuous Integration su:

- ogni push, indipendentemente dal branch;
- pull request verso `main`.

La pipeline esegue il checkout del repository, prepara la configurazione non sensibile, avvia PostgreSQL e ne attende lo stato `healthy`, installa le dipendenze tramite `npm ci` ed esegue `npm run verify` nel container applicativo. Il cleanup finale elimina i container e i volumi creati dalla run.

Il job fallisce se fallisce uno dei controlli inclusi nel quality gate: compilazione TypeScript, type-check dei test, ESLint o Jest.

## Workflow Git

Il progetto individuale usa `main` come branch di integrazione e può utilizzare feature branch brevi quando un incremento lo rende utile.

Prima di integrare una modifica è necessario verificare che il quality gate sia verde e aggiornare insieme codice, test, UML e documentazione quando la modifica coinvolge più artefatti.

Non viene adottato Git Flow e non vengono introdotti branch `develop`, `staging` o `production` senza una necessità concreta.

## Documentazione

La documentazione viene mantenuta nello stesso repository del codice e versionata insieme al progetto.

- requisiti: [`docs/requisiti.tex`](docs/requisiti.tex);
- modellazione: [`docs/modellazione.md`](docs/modellazione.md);
- architettura e decisioni di design: [`docs/architettura.md`](docs/architettura.md);
- diagrammi UML PlantUML:
  - `uml/use-case.puml`;
  - `uml/domain-model.puml`;
  - `uml/class-diagram.puml`;
  - `uml/sequence-uc01.puml`;
  - `uml/activity-uc01.puml`;
  - `uml/sequence-uc02.puml`.

Le sorgenti PlantUML sono la rappresentazione autorevole dei diagrammi modellati e vengono esportate in PDF per la relazione.

## Release

La release finale viene identificata tramite un tag Git, ad esempio `v1.0.0`, dopo la verifica di build, test, CI, documentazione, tracciabilità e changelog.
