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

La baseline UML approvata è documentata in [`docs/modellazione.md`](docs/modellazione.md). Le decisioni architetturali e tecnologiche sono documentate in [`docs/architettura.md`](docs/architettura.md) e rappresentate in [`uml/class-diagram.puml`](uml/class-diagram.puml).

Fase corrente:
- **Fase 04 — Setup progetto, build, test e CI**, con creazione della struttura Node.js/Express, configurazione Docker Compose, PostgreSQL, prima build eseguibile, baseline dei test Jest e workflow di Continuous Integration.

## Quickstart

### Prerequisiti

Per eseguire il progetto sono necessari:

- Git;
- Docker con Docker Compose;
- accesso al repository GitHub privato del progetto.

### Installazione e setup del progetto

Nei comandi seguenti le espressioni racchiuse tra parentesi quadre, come `[NOME_CARTELLA_PROGETTO]`, sono segnaposto da sostituire con un valore reale.

Ad esempio:

```text
[NOME_CARTELLA_PROGETTO] -> gestionale_affitti
```

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

Personalizzare quindi i valori presenti in `docker/.env`.

Il file `docker/.env` contiene la configurazione locale e non deve essere versionato; `docker/.env.example` rimane invece nel repository come template.

#### 3. Scaricare le immagini Docker

```bash
docker compose -f docker/compose.yaml pull
```

#### 4. Installare le dipendenze Node.js

Le dipendenze applicative e di sviluppo sono definite in `package.json` e bloccate in `package-lock.json`. Per installarle in modo riproducibile eseguire:

```bash
docker compose -f docker/compose.yaml run --rm app npm ci
```

Al termine della procedura è possibile verificare il funzionamento dell'ambiente seguendo la sezione successiva.

### Verifica installazione

La seguente procedura verifica l'avvio di PostgreSQL e la comunicazione dal container Node.js verso il database.

#### 1. Avviare PostgreSQL

```bash
docker compose -f docker/compose.yaml up -d db
```

#### 2. Verificare lo stato dei servizi

```bash
docker compose -f docker/compose.yaml ps
```

Attendere che il servizio `db` risulti `healthy`.

#### 3. Verificare la connessione Node.js -> PostgreSQL

```bash
docker compose -f docker/compose.yaml run --rm app node -e "
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

client.connect()
  .then(() => client.query('SELECT version()'))
  .then(result => {
    console.log(result.rows[0].version);
    return client.end();
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
"
```

Se la configurazione è corretta, l'output conterrà la versione del server PostgreSQL, ad esempio:

```text
PostgreSQL 16.15 ...
```

I comandi per avviare l'applicazione ed eseguire build e test verranno aggiunti in questa sezione non appena saranno definiti e verificati gli script npm della Fase 04.

## Usage

La versione `1.0` sarà utilizzata dal **proprietario**, unico attore che interagisce direttamente con il sistema.

I due flussi principali previsti sono:

1. registrazione di un nuovo contratto di locazione relativo all'intero immobile;
2. registrazione del pagamento mensile del canone relativo a un contratto esistente.

La versione `1.0` non gestisce, tra le altre funzionalità, autenticazione e autorizzazione, locazione parziale, rinnovi contrattuali, pagamenti parziali, trasferimenti bancari reali, firma o registrazione fiscale del contratto.

Per i dettagli comportamentali e i criteri di accettazione fare riferimento a [`docs/requisiti.tex`](docs/requisiti.tex).

## Configurazione

La baseline tecnologica approvata usa:

- Node.js 24 LTS + Express.js per il backend;
- HTML5, CSS e JavaScript vanilla per il frontend;
- PostgreSQL 16 come database;
- `pg` come driver SQL;
- JSONB per la bozza di UC-01;
- HTML persistito come `TEXT` per il contenuto storico del Contratto;
- Docker Compose con container separati per applicazione e database.

La configurazione Docker è mantenuta nella cartella `docker/`. Il file `docker/.env.example` documenta le variabili richieste, mentre `docker/.env` contiene i valori locali e non viene versionato. I comandi di avvio dell'applicazione e di build/test verranno aggiunti al Quickstart non appena saranno definiti e verificati gli script npm corrispondenti.

## Test

Jest è il framework scelto per unit test, assert, spy e mock. La suite verrà introdotta insieme alla baseline costruibile e crescerà con gli incrementi dei due casi d'uso core. I test di business logic resteranno indipendenti dal database tramite le porte applicative; pochi integration test mirati verificheranno successivamente mapping PostgreSQL e transazioni.

## Contributing

Il progetto è individuale; questa sezione definisce quindi le regole minime utilizzate per mantenerne coerente l'evoluzione.

- effettuare modifiche piccole e logicamente coerenti;
- mantenere allineati requisiti, UML, codice, test e documentazione quando una modifica li coinvolge;
- aggiungere o aggiornare i test insieme ai comportamenti implementati;
- aggiornare il README quando cambiano setup, configurazione o modalità d'uso;
- evitare l'introduzione di funzionalità fuori scope prima del completamento dei due casi d'uso core.

Il workflow Git concreto verrà documentato quando verrà definito nella relativa fase del progetto.

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

La release finale del progetto sarà identificata tramite un tag Git, ad esempio `v1.0.0`, dopo la verifica di build, test, CI, documentazione e tracciabilità.
