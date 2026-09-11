# Gestionale Affitti

L'obiettivo è realizzare un sistema piccolo ma completo per la gestione essenziale di locazioni immobiliari, mantenendo coerenza tra requisiti, modellazione, design, implementazione e test.

## Overview

La versione `1.0` è focalizzata su due casi d'uso principali end-to-end:

- **UC-01 — Registrare un contratto di locazione**: il proprietario registra un contratto relativo all'intero immobile mediante una procedura guidata, con validazione progressiva dei dati e controlli di coerenza.
- **UC-02 — Registrare il pagamento di un canone**: il proprietario individua il contratto e registra il pagamento completo della prima mensilità non ancora pagata.

Il progetto privilegia uno scope contenuto, la testabilità, la chiarezza delle responsabilità e la tracciabilità rispetto al numero di funzionalità.

La specifica completa dello scope, delle user stories, dei requisiti funzionali e non funzionali e degli acceptance criteria è disponibile in [`docs/requisiti.tex`](docs/requisiti.tex).

### Stato del progetto

Il progetto è in corso di sviluppo.

Fasi completate:

- definizione del progetto e dello scope;
- requisiti, user stories e acceptance criteria;
- **Fase 02 — Modellazione UML**, comprendente Use Case Diagram, Domain Model, Class Diagram, Sequence Diagram di UC-01, Activity Diagram di UC-01 e Sequence Diagram di UC-02;
- **Fase 03 — Architettura, class design e SOLID**, comprendente architettura client-server con backend monolitico layered, Dependency Rule, porte applicative, responsabilità dei Service, confine transazionale di UC-01, review SRP/DIP/OCP, scelta motivata sui design pattern, stack applicativo e strategia di persistenza.

La **Fase 04 — Setup progetto, build, test e CI** è completata. La baseline dispone di:

- ambiente Docker Compose riproducibile;
- bootstrap minimo Express con endpoint tecnico `GET /health`;
- primo comportamento reale di dominio, `Contratto.siSovrapponeA`;
- unit test Jest deterministici e indipendenti dal database;
- comando canonico di verifica eseguito nel container applicativo;
- workflow GitHub Actions su push e pull request verso `main`;
- verifica CI completata con esito verde sulla baseline.

La fase successiva è **Fase 05 — UC-01: implementazione incrementale e test**.

La baseline UML approvata è documentata in [`docs/modellazione.md`](docs/modellazione.md). Le decisioni architetturali e tecnologiche sono documentate in [`docs/architettura.md`](docs/architettura.md) e rappresentate in [`uml/class-diagram.puml`](uml/class-diagram.puml).

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

La baseline verificata usa:

```text
node:24.21.0-alpine3.24
postgres:16.15-alpine3.24
```

### Avvio dell'applicazione

Avviare i servizi:

```bash
docker compose --env-file docker/.env -f docker/compose.yaml up
```

Il container applicativo esegue il bootstrap Express tramite `npm run dev`; PostgreSQL viene avviato come dipendenza e deve raggiungere lo stato `healthy`.

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

### Verifica del progetto

Il comando canonico da eseguire dall'host installa le dipendenze dal lockfile ed esegue la suite di test **dentro il container Node.js di riferimento**:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/compose.yaml \
  run --rm --no-deps app \
  sh -c "npm ci && npm run verify"
```

`--no-deps` evita di avviare PostgreSQL perché gli unit test attualmente presenti verificano esclusivamente logica di dominio e non richiedono servizi esterni.

All'interno del container il comando di verifica applicativa è:

```bash
npm run verify
```

La scelta mantiene separate le responsabilità: Docker fornisce l'ambiente riproducibile, mentre lo script npm definisce la verifica del software.

## Usage

La versione `1.0` sarà utilizzata dal **proprietario**, unico attore che interagisce direttamente con il sistema.

I due flussi principali previsti sono:

1. registrazione di un nuovo contratto di locazione relativo all'intero immobile;
2. registrazione del pagamento mensile del canone relativo a un contratto esistente.

La versione `1.0` non gestisce, tra le altre funzionalità, autenticazione e autorizzazione, locazione parziale, rinnovi contrattuali, pagamenti parziali, trasferimenti bancari reali, firma o registrazione fiscale del contratto.

Per i dettagli comportamentali e i criteri di accettazione fare riferimento a [`docs/requisiti.tex`](docs/requisiti.tex).

## Configurazione

La baseline tecnologica usa:

- Node.js 24 LTS, con immagine verificata `node:24.21.0-alpine3.24`;
- Express.js per il backend;
- CommonJS come sistema di moduli;
- npm e `package-lock.json` per la gestione riproducibile delle dipendenze;
- HTML5, CSS e JavaScript vanilla per il frontend;
- PostgreSQL 16, con immagine verificata `postgres:16.15-alpine3.24`;
- `pg` come driver SQL;
- JSONB per la bozza di UC-01;
- HTML persistito come `TEXT` per il contenuto storico del Contratto;
- Docker Compose con container separati per applicazione e database.

La configurazione Docker è mantenuta nella cartella `docker/`. Il file `docker/.env.example` documenta le variabili richieste, mentre `docker/.env` contiene i valori locali e non viene versionato.

## Struttura del progetto

La struttura fisica segue i boundary approvati dall'architettura e viene materializzata incrementalmente quando compaiono file con una responsabilità reale:

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
docs/
uml/
docker/
```

Le directory vuote non vengono mantenute artificialmente con file placeholder: vengono versionate quando contengono il primo artefatto necessario.

## Test

Jest è il framework scelto per unit test, assert, spy e mock.

La prima regola di dominio implementata e protetta dai test è `Contratto.siSovrapponeA`, collegata al vincolo che vieta la sovrapposizione dei periodi contrattuali dello stesso immobile. I test verificano anche la semantica degli estremi inclusivi: condividere il giorno finale costituisce sovrapposizione, mentre iniziare il giorno successivo non la costituisce.

Gli unit test di business logic restano indipendenti dal database. PostgreSQL verrà coinvolto soltanto quando saranno introdotti integration test che richiedono realmente mapping, query o transazioni.

## Continuous Integration

Il repository usa GitHub Actions per la Continuous Integration.

Il workflow viene eseguito su:

- push verso `main`;
- pull request verso `main`.

La pipeline minima esegue:

```text
checkout
→ preparazione della configurazione non sensibile
→ avvio del container applicativo per la verifica
→ npm ci
→ npm run verify
→ esito del job
```

La CI usa la stessa immagine Node.js e lo stesso comando applicativo della verifica locale. PostgreSQL non viene avviato nella baseline degli unit test perché non è una dipendenza dei comportamenti attualmente verificati.

Un fallimento di Jest produce un exit code non nullo e rende il job CI rosso; non è necessario introdurre intenzionalmente commit falliti su `main` per dimostrarlo.

## Workflow Git

Il progetto individuale usa `main` come branch di integrazione e può utilizzare feature branch brevi quando un incremento lo rende utile.

Prima di integrare un incremento:

1. la modifica deve essere piccola e logicamente coerente;
2. la verifica locale nel container deve essere verde;
3. codice, test, UML e documentazione devono essere aggiornati insieme quando la modifica li coinvolge;
4. dopo il push la CI deve verificare automaticamente l'incremento;
5. un eventuale feature branch viene integrato in `main` soltanto con verifica verde.

Non viene adottato Git Flow e non vengono introdotti branch `develop`, `staging` o `production` senza una necessità concreta.

## Documentazione

La documentazione viene mantenuta nello stesso repository del codice e versionata insieme al progetto.

- requisiti: [`docs/requisiti.tex`](docs/requisiti.tex);
- decisioni e stato della modellazione: [`docs/modellazione.md`](docs/modellazione.md);
- architettura e decisioni di design: [`docs/architettura.md`](docs/architettura.md);
- diagrammi UML PlantUML:
  - `uml/use-case.puml`;
  - `uml/domain-model.puml`;
  - `uml/class-diagram.puml`;
  - `uml/sequence-uc01.puml`;
  - `uml/activity-uc01.puml`;
  - `uml/sequence-uc02.puml`;
- relazione: `docs/` (da aggiungere nelle fasi successive);
- ADR separati: da aggiungere soltanto se emergeranno decisioni architetturali che richiedono una trattazione autonoma rispetto a `docs/architettura.md`;
- changelog: da aggiungere prima della prima release.

Le sorgenti PlantUML approvate verranno esportate in PDF e inserite nella relazione LaTeX nella fase di documentazione finale.

## Release

La release finale del progetto sarà identificata tramite un tag Git, ad esempio `v1.0.0`, dopo la verifica di build/esecuzione, test, CI, documentazione e tracciabilità.
