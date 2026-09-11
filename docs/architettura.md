# Architettura e design — Gestionale Affitti

Questo documento raccoglie le decisioni architetturali e di design approvate per la versione 1.0 di **Gestionale Affitti**. La baseline corrente è sufficientemente consolidata per avviare il setup e l'implementazione; eventuali problemi emersi da codice e test potranno riaprire review mirate, mantenendo allineati requisiti, UML, design e implementazione.

## Stato della progettazione

La versione 1.0 resta focalizzata sui due casi d'uso core:

- **UC-01 — Registrare un contratto di locazione**;
- **UC-02 — Registrare il pagamento di un canone**.

Sono consolidate:

- architettura client-server con backend monolitico layered;
- separazione logica `interface` / `application` / `domain` / `infrastructure`;
- Dependency Rule e DIP verso persistenza, generazione del documento e data corrente;
- responsabilità dei Service applicativi dei due casi d'uso;
- modello e lifecycle della bozza di UC-01;
- porte applicative e confine transazionale della registrazione definitiva;
- regole di periodo, competenze mensili e pro-rata;
- `Articolo` come solo template della tipologia contrattuale;
- contenuto storico conservato direttamente nel `Contratto`;
- stack Node.js/Express con frontend HTML/CSS/JavaScript;
- PostgreSQL con driver `pg`, persistenza relazionale dei dati definitivi e JSONB per la bozza;
- esecuzione locale tramite Docker Compose con container separati per applicazione e database;
- Jest per unit test e mocking;
- decisione motivata di non introdurre Strategy, Factory Method, Adapter o Observer nella versione 1.0.

## Architectural drivers

### Requisiti funzionali core

UC-01 richiede una procedura guidata recuperabile, gestione di dati esistenti e nuovi, controlli di duplicazione, verifica della sovrapposizione dei periodi contrattuali, generazione del documento definitivo a partire dai template della tipologia, registrazione atomica dei dati definitivi e creazione del primo pagamento.

UC-02 richiede l'individuazione della mensilità non pagata cronologicamente più vecchia fino al mese corrente, l'applicazione delle regole di pagabilità e scadenza, il calcolo automatico dell'importo e la registrazione del pagamento soltanto dopo conferma esplicita.

### Requisiti non funzionali rilevanti

- **RNF-01 — recuperabilità:** la bozza di UC-01 deve essere persistibile e recuperabile dopo un'interruzione.
- **RNF-02 — prestazioni:** le interazioni che coinvolgono il server devono restare semplici e proporzionate allo scope della versione 1.0.
- **RNF-03 — sicurezza:** la validazione client migliora l'interazione, ma il server resta responsabile della validazione autorevole e del trattamento sicuro degli input.
- **RNF-04 — coerenza:** un errore non deve lasciare dati definitivi parziali o incoerenti; la registrazione definitiva di UC-01 richiede un confine atomico.
- **RNF-05 — feedback:** stato di elaborazione ed esito delle operazioni con attesa sono responsabilità della presentazione/client.

### Altri driver

- persistenza dei dati definitivi e della bozza;
- testabilità dei casi d'uso senza dipendere da database, filesystem o orologio reale;
- distinzione tra orchestrazione applicativa e regole di dominio;
- scope individuale limitato a due casi d'uso;
- mono-utenza della versione 1.0;
- ambiente locale riproducibile tramite container;
- possibilità di evoluzione senza introdurre nella versione corrente microservizi, distribuzione o complessità non richieste.

## Stile architetturale

### Problema

Il sistema è un'applicazione web e i requisiti distinguono client e server. Il backend deve separare interazione, orchestrazione, regole di dominio e persistenza senza introdurre la complessità di un'architettura distribuita.

### Scelta

La versione 1.0 adotta una combinazione di stili:

- **client-server** per il confine tra browser e backend;
- **layered** per l'organizzazione interna del backend;
- persistenza centralizzata, accessibile tramite porte dichiarate dall'application layer.

Il backend rimane un'unica applicazione monolitica dal punto di vista del deployment. Il fatto che applicazione e PostgreSQL siano eseguiti in container distinti non implica microservizi: il database è una dipendenza infrastrutturale del singolo backend.

### Alternative considerate

Lo stile service-based non viene adottato perché i due casi d'uso non richiedono servizi indipendenti, scalabilità separata o deployment autonomi. Lo stile repository non viene assunto come stile architetturale principale: la persistenza centralizzata è presente, ma il problema dominante è la separazione delle responsabilità interne del backend.

### Trade-off

La separazione introduce più confini e alcune astrazioni iniziali. Il costo viene accettato per ottenere testabilità, sostituibilità della persistenza e chiarezza delle responsabilità. Si evita invece di aggiungere ulteriori layer senza un problema concreto da risolvere.

## Stack tecnologico

### Backend

- **Node.js LTS** come runtime;
- **Express.js** come framework HTTP;
- **Nodemon** come strumento di sviluppo;
- **pg** come driver PostgreSQL.

Non viene introdotto un ORM. Le query SQL e il mapping appartengono all'infrastruttura e sono implementati esplicitamente tramite `pg`.

### Frontend

Il client usa:

- HTML5;
- CSS;
- JavaScript vanilla;
- `fetch()` nativo per le chiamate HTTP/JSON al backend.

Non viene introdotto un framework SPA o un template engine aggiuntivo. Il frontend resta volutamente piccolo e focalizzato sui due workflow core.

### Test

**Jest** è la dipendenza scelta per unit test, assert, spy e mock. La scelta evita di combinare più librerie di testing e permette di testare i Service sostituendo repository, generatori e provider temporali.

### Ambiente locale

Docker Compose governa almeno due servizi:

```text
app  -> Node.js + Express
 db  -> PostgreSQL
```

Docker è una scelta operativa per riproducibilità e isolamento dell'ambiente, non un requisito architetturale del dominio.

## Layer e direzione delle dipendenze

Il backend è organizzato secondo quattro responsabilità logiche.

### `interface`

Rappresenta il confine di ingresso del server.

Responsabilità:

- ricevere le richieste dal client;
- applicare controlli tecnici e formali sul formato dei dati ricevuti;
- trasformare l'input nella forma richiesta dall'application layer;
- invocare il caso d'uso corretto;
- tradurre gli esiti applicativi nella risposta verso il client.

Non contiene regole di dominio, query, transazioni o dettagli di persistenza.

L'organizzazione fisica usa la cartella `web` per rendere esplicita la responsabilità HTTP/presentation; il layer logico corrispondente resta `interface`.

### `application`

Coordina i casi d'uso e il loro workflow.

Responsabilità:

- decidere la sequenza delle operazioni;
- recuperare e persistere dati tramite porte;
- governare il ciclo di vita della bozza;
- invocare le regole di dominio;
- gestire successo ed errori applicativi;
- delimitare logicamente le operazioni che devono essere atomiche.

Non conosce HTTP, SQL, `pg`, PostgreSQL o Docker.

### `domain`

Contiene oggetti e regole stabili del dominio degli affitti.

Comprende comportamenti necessari a esprimere:

- calcolo della data finale del contratto;
- verifica dei vincoli del periodo;
- calcolo dell'importo delle competenze mensili;
- pro-rata della prima e dell'ultima mensilità;
- scadenza delle competenze;
- invarianti dei pagamenti;
- stato temporale del Contratto derivato da periodo e data corrente.

`Articolo` rappresenta esclusivamente il template contrattuale e non viene copiato nel Contratto registrato.

Il domain non conosce UI, database, SQL, framework o formato JSONB.

### `infrastructure`

Contiene i dettagli tecnici sostituibili.

Responsabilità:

- implementazioni PostgreSQL delle porte di persistenza;
- query SQL e mapping record/oggetti;
- serializzazione JSONB della bozza;
- pool e connessioni `pg`;
- meccanismo tecnico `BEGIN` / `COMMIT` / `ROLLBACK`;
- implementazione concreta del generatore del documento HTML;
- implementazione della sorgente della data corrente;
- logging e altri dettagli tecnici quando necessari.

Non contiene workflow dei casi d'uso né formule economiche o contrattuali.

### Direzione delle dipendenze

```text
browser
  ↓
web (interface logica)
  ↓
application
  ↓
domain

application ─────→ port / repository
                       ↑
                       │ implementa
                 infrastructure
```

Il `domain` non dipende dalla persistenza. L'`application` dipende dalle astrazioni richieste dai casi d'uso; le implementazioni concrete dell'infrastruttura dipendono dagli stessi contratti applicativi.

## Componenti applicativi dei casi d'uso

### `RegistraContrattoService`

**Responsabilità principale:** orchestrare UC-01.

Coordina:

- avvio e ripresa della procedura;
- validazione applicativa e avanzamento degli step;
- recupero o verifica dell'Immobile;
- identificazione di proprietario e inquilino;
- gestione della bozza;
- caricamento della tipologia contrattuale e degli articoli template;
- invocazione delle regole del `Contratto`;
- controllo della sovrapposizione usando dati recuperati tramite repository;
- acquisizione della data corrente tramite `DataCorrenteProvider`;
- costruzione del `Contratto` soltanto alla conferma finale;
- generazione del documento definitivo tramite `GeneratoreDocumentoContratto`;
- assegnazione del contenuto HTML al `Contratto`;
- creazione del primo `Pagamento` usando l'importo determinato dal dominio;
- richiesta della registrazione definitiva;
- eliminazione della bozza soltanto dopo il successo della registrazione.

Non contiene query, serializzazione, rendering concreto del documento o formule economiche duplicate.

Durante gli step dedicati alle persone, una Persona già registrata viene caricata come working copy nella bozza e presentata al proprietario per verifica ed eventuale modifica. Nell'ambito di UC-01 `id` e `codiceFiscale` restano invariati; dati anagrafici, residenza e, per l'inquilino, documento di riconoscimento possono essere corretti. Un Immobile già registrato viene invece soltanto selezionato e non viene modificato nel contesto di UC-01.

### `RegistraPagamentoService`

**Responsabilità principale:** orchestrare UC-02.

Coordina:

- selezione dell'immobile e dell'inquilino;
- recupero dei contratti e dei pagamenti esistenti;
- individuazione della competenza non pagata cronologicamente più vecchia fino al mese corrente;
- esclusione di competenze già pagate o future;
- richiesta al `Contratto` dell'importo e della scadenza della competenza;
- preparazione dei dati mostrati al proprietario;
- alla conferma, ricaricamento e rivalidazione dei dati autorevoli;
- creazione del `Pagamento` soltanto dopo conferma;
- associazione del nuovo `Pagamento` al `Contratto` tramite `Contratto.aggiungiPagamento`;
- richiesta a `PagamentoRepository` di persistere esplicitamente il nuovo pagamento per il Contratto identificato.

La data corrente non è un input del client. `RegistraPagamentoService` la ottiene da `DataCorrenteProvider`, rendendo il server autorevole e i test deterministici.

## Regole delle competenze mensili

Non viene introdotta una classe software autonoma `Mensilita` nella versione corrente.

Le regole temporali ed economiche sono responsabilità del `Contratto`, che dispone di `dal`, `/al`, `canoneMensile` e `giornoPagamento`.

Le regole approvate sono:

- `dal` e `al` sono inclusivi;
- una competenza interamente compresa nel periodo ha importo pari a `canoneMensile`;
- la prima competenza è calcolata in pro-rata quando `dal` non coincide con il primo giorno del mese;
- l'ultima competenza è calcolata in pro-rata quando `al` non coincide con l'ultimo giorno del mese;
- la formula è `canoneMensile * giorniCoperti / giorniDelMese`;
- non vengono effettuati arrotondamenti intermedi;
- il risultato finale è arrotondato a due cifre decimali;
- il pro-rata rappresenta l'importo completo dovuto per il periodo coperto e non costituisce un pagamento parziale.

L'individuazione della competenza non ancora pagata resta responsabilità di `RegistraPagamentoService`, perché richiede il confronto tra periodo del contratto, Pagamenti persistiti e data corrente.

## Articoli template e documento storico

### `Articolo`

`Articolo` rappresenta soltanto il template della `TipologiaContrattuale`. Non esistono copie valorizzate associate al `Contratto`.

Uno stesso articolo logico può essere diviso in parti ordinate:

```text
numArticolo = numero dell'articolo
numParte    = posizione del frammento
```

Per esempio, più record con `numArticolo = 7` e `numParte = 0, 1, ...` permettono di inserire un valore dinamico tra parti consecutive del testo durante la generazione del documento.

La separazione tra `numArticolo` e `numParte` evita di codificare entrambe le informazioni in un numero decimale, dove valori come `7.1` e `7.10` non sarebbero distinguibili numericamente.

### `GeneratoreDocumentoContratto`

È una porta dichiarata nell'application layer.

Responsabilità:

- produrre il documento completo del contratto a partire dal `Contratto` definitivo e dagli articoli template raggiungibili tramite la relativa tipologia;
- comporre le parti degli articoli e i valori dinamici usando esclusivamente i dati finali validati;
- restituire una stringa HTML nella versione 1.0.

Il browser può mostrare una preview, ma il contenuto autorevole salvato non viene inviato dal client: viene generato lato server alla conferma finale.

### Contenuto storico nel `Contratto`

La precedente classe `ContrattoRegistrato` non viene mantenuta. Non possedeva un lifecycle o comportamento autonomo sufficiente a giustificare una relazione 1:1 separata.

Il `Contratto` contiene direttamente:

- `registratoIl : date`;
- `contenuto : string`.

`registratoIl` è valorizzato quando viene eseguita la conferma definitiva. Poiché prima di tale conferma esiste soltanto `BozzaContratto`, non viene usato un valore `null` per distinguere un Contratto registrato da una bozza.

`contenuto` è il documento storico completo. Nella versione 1.0 il formato è **HTML** e viene persistito come `TEXT`. L'HTML evita una conversione Markdown → HTML e permette una personalizzazione grafica compatibile con un'eventuale futura esportazione PDF.

Il PDF non viene trattato come garanzia intrinseca di immutabilità. L'immutabilità applicativa deriva dal fatto che il contenuto storico non viene rigenerato o modificato usando dati successivi. Una futura versione potrà aggiungere un file PDF e un relativo path separato, senza cambiare la semantica di `contenuto`.

## Bozza di UC-01

### Problema

La procedura di registrazione deve sopravvivere a interruzioni e deve contenere anche nuovi Immobili, nuove Persone, modifiche a Persone già registrate e dati di riconoscimento non ancora persistiti definitivamente.

### Scelta

`BozzaContratto` è un **application model dedicato**, non un'entità del Domain Model e non una versione incompleta di `Contratto`.

Conserva esclusivamente i dati necessari a riprendere e completare la procedura:

- step raggiunto;
- Immobile selezionato o nuovo Immobile acquisito;
- working copy di proprietario e inquilino;
- documento di riconoscimento quando pertinente;
- tipologia selezionata;
- dati contrattuali acquisiti.

Non conserva:

- un `Contratto` già generato;
- documento HTML;
- copie degli `Articolo`;
- `Pagamento` definitivo.

Il `Contratto` viene costruito soltanto quando il proprietario preme il comando finale di registrazione.

La bozza opera come working copy: può contenere oggetti nuovi privi di id oppure copie di oggetti persistiti con il relativo id. Non vengono usati flag `...Nuovo`; la distinzione tra creazione e aggiornamento appartiene alla persistenza definitiva.

### Ciclo di vita

- dopo il primo step valido la bozza viene creata;
- dopo ogni step valido viene aggiornata;
- alla riapertura di UC-01 l'eventuale bozza viene confrontata progressivamente con i contratti già registrati;
- il confronto usa, quando disponibili, identificazione catastale dell'Immobile, codice fiscale dell'Inquilino e periodo `dal`--`al`;
- solo se tutti e tre gli elementi sono disponibili e coincidono con un contratto registrato, la bozza è considerata residua e viene eliminata silenziosamente;
- se il confronto non è completo o non coincide, la bozza viene recuperata normalmente;
- l'annullamento elimina la bozza;
- un errore nella registrazione definitiva non elimina la bozza;
- dopo il commit riuscito viene tentata l'eliminazione della bozza, ma un eventuale errore di cleanup non invalida il contratto già registrato.

### Persistenza JSONB

La bozza viene persistita in PostgreSQL come documento JSONB. La rappresentazione persistente è responsabilità esclusiva dell'infrastruttura e viene ottenuta tramite mapping esplicito tra `BozzaContratto` e plain JSON; non viene serializzato automaticamente il grafo interno delle classi JavaScript.

La versione 1.0 è mono-utente e ammette una sola bozza attiva. La tabella può quindi usare uno slot tecnico unico, privo di significato nel dominio, per implementare `salva()` tramite upsert. Non viene introdotto un `idBozza` nell'application model.

## Porte di persistenza

Le porte restano orientate ai casi d'uso e non alle singole tabelle.

### `BozzaContrattoRepository`

Operazioni concettuali:

```text
recupera()
salva(bozza)
elimina()
```

### `ImmobileRepository`

Usato per selezione e recupero degli immobili e per i controlli di duplicazione catastale e, quando previsto, dell'indirizzo completo. Il repository risponde a domande sui dati persistiti; non decide se il workflow può avanzare.

### `PersonaRepository`

Usato per identificare una Persona tramite codice fiscale e recuperare l'eventuale soggetto già registrato.

### `TipologiaContrattualeRepository`

Usato per recuperare le tipologie contrattuali e i relativi articoli template necessari a UC-01. Non viene introdotto un `ArticoloRepository` autonomo perché i template sono sempre letti nel contesto della tipologia.

### `ContrattoRepository`

Usato da entrambi i casi d'uso per recuperare i contratti necessari. In UC-01 fornisce i contratti relativi all'immobile; il significato della sovrapposizione resta nel dominio.

### `RegistrazioneContrattoPort`

Usata da `RegistraContrattoService` per la sola scrittura definitiva di UC-01.

Espone:

```text
registraDefinitivamente(contratto : Contratto)
```

Il `Contratto` ricevuto è la rappresentazione autorevole dello stato definitivo e rende raggiungibili Immobile, proprietario, inquilino, tipologia e primo Pagamento; contiene inoltre `registratoIl` e il contenuto HTML completo.

La precondizione richiede:

- contenuto storico presente;
- almeno un `Pagamento` associato.

La porta non riceve riferimenti duplicati agli stessi dati, evitando rappresentazioni discordanti.

### `PagamentoRepository`

Operazioni di design:

```text
trovaPerContratto(contrattoId : int) : List<Pagamento>
salva(contrattoId : int, pagamento : Pagamento) : void
```

Prima della scrittura, UC-02 aggiunge il pagamento al Contratto tramite `Contratto.aggiungiPagamento`, proteggendo le invarianti note. La relazione persistente con il Contratto viene resa esplicita nella porta senza aggiungere una back-reference tecnica a `Pagamento`.

## Persistenza concreta e mapping PostgreSQL

### Strategia generale

I dati definitivi sono memorizzati in forma relazionale. La bozza è l'unica struttura persistita come JSONB. Il documento storico del Contratto è HTML memorizzato come `TEXT`.

L'accesso al database usa SQL esplicito tramite `pg`; non viene introdotto un ORM. Le implementazioni concrete delle porte appartengono a `infrastructure/persistence/postgres` e ricostruiscono gli oggetti di dominio tramite mapping esplicito.

### Tabelle principali

La baseline prevede:

```text
indirizzo
persona
documento_riconoscimento
immobile
dati_catastali
tipologia_contrattuale
articolo
contratto
pagamento
bozza_contratto
```

L'esistenza di una tabella non implica l'esistenza di un repository applicativo autonomo. `Indirizzo`, `DatiCatastali`, `DocumentoRiconoscimento` e `Articolo` vengono persistiti attraverso le implementazioni delle porte che gestiscono i relativi aggregati o casi d'uso.

### Identificatori

Gli identificatori tecnici persistenti usano PostgreSQL `INTEGER ... GENERATED ... AS IDENTITY` e sono rappresentati come `int` nel Class Diagram.

Le chiavi naturali e i vincoli del dominio restano separati dall'id tecnico, per esempio:

- codice fiscale della Persona;
- identificazione catastale dell'Immobile;
- competenza anno/mese del Pagamento all'interno del Contratto.

UUID e `BIGINT` non vengono introdotti perché lo scope non richiede identificatori distribuiti o volumi che li giustifichino.

### Tabella `articolo`

`Articolo` è solo template della tipologia. La rappresentazione prevista è concettualmente:

```text
id                        INTEGER IDENTITY PRIMARY KEY
tipologia_contrattuale_id INTEGER NOT NULL FK
num_articolo              INTEGER NOT NULL
num_parte                 INTEGER NOT NULL
titolo                    TEXT NOT NULL
sottotitolo               TEXT NULL
descrizione               TEXT NOT NULL
```

Vincolo:

```text
UNIQUE(tipologia_contrattuale_id, num_articolo, num_parte)
```

`tipologia_contrattuale_id` è una foreign key e non una stringa duplicata con il nome della tipologia.

### Tabella `contratto`

La tabella contiene i dati definitivi del Contratto, inclusi:

- riferimenti a Immobile, proprietario, inquilino e tipologia;
- `dal`;
- `canone_mensile`;
- `giorno_pagamento`;
- `registrato_il`;
- `contenuto` HTML in `TEXT`.

`registrato_il` e `contenuto` sono `NOT NULL` nello storage definitivo.

La data `/al` non viene memorizzata nella baseline corrente perché è derivata da `dal` e dalla durata della tipologia. Lo stato futuro / in essere / scaduto non viene persistito: è calcolato al momento dell'uso confrontando il periodo con la data corrente.

### Vincoli strutturali nel database

PostgreSQL replica i vincoli strutturali semplici che proteggono la consistenza persistente, senza spostare nel database la business logic applicativa. Esempi:

```text
persona.codice_fiscale UNIQUE

dati_catastali:
UNIQUE(codice_comunale, foglio, particella, subalterno)

pagamento:
UNIQUE(contratto_id, anno_competenza, mese_competenza)
CHECK(mese_competenza BETWEEN 1 AND 12)

contratto:
CHECK(giorno_pagamento BETWEEN 1 AND 28)
```

La sovrapposizione tra periodi di contratti dello stesso Immobile resta una regola del dominio e non viene implementata tramite exclusion constraint PostgreSQL nella versione 1.0. Lo scope mono-utente non giustifica ancora una protezione più complessa contro registrazioni concorrenti.

### Schema versionato

Lo schema e i dati iniziali vengono mantenuti come SQL versionato nel repository, per esempio:

```text
db/
  migrations/
    001-initial-schema.sql
  seed/
    001-tipologie-contrattuali.sql
```

Non viene introdotto un migration framework aggiuntivo nella baseline corrente.

## Confine transazionale di UC-01

### Problema

Alla conferma di UC-01 devono diventare persistenti in modo coerente più oggetti collegati. RNF-04 vieta stati definitivi parziali, ma la cancellazione della bozza successiva al successo non deve poter annullare il lavoro già completato.

### Scelta

`RegistraContrattoService` costruisce il Contratto soltanto alla conferma, assegna `registratoIl`, genera e assegna il contenuto HTML, crea il primo Pagamento e invoca `RegistrazioneContrattoPort`.

L'implementazione PostgreSQL usa una sola connessione `pg` e una singola transazione:

```text
pool.connect()
    ↓
BEGIN
    ↓
sincronizza nuovi/modificati dati di Persona
persiste eventuale nuovo Immobile e dati collegati
inserisce Contratto con registratoIl e contenuto HTML
inserisce primo Pagamento
    ↓
COMMIT
```

A qualsiasi errore:

```text
ROLLBACK
```

Solo dopo il commit:

```text
BozzaContrattoRepository.elimina()
```

Se la registrazione definitiva fallisce, nessun dato definitivo deve rimanere persistito e la bozza resta disponibile. Se il commit riesce ma la cancellazione della bozza fallisce, il Contratto rimane valido e la bozza residua viene gestita alla successiva apertura.

### Alternative considerate

Una generica Unit of Work è stata scartata perché introdurrebbe flessibilità non necessaria. È stata scartata anche l'inclusione della bozza nella transazione dei dati definitivi: un errore di cleanup non deve invalidare una registrazione già completata.

## Class design approvato

### Application model

`BozzaContratto` e `PagamentoDaRegistrare` sono application model e non entità del Domain Model.

`PagamentoDaRegistrare` contiene identificatore del Contratto, dati contrattuali essenziali da mostrare, competenza, scadenza, importo e stati derivati `dovuta` e `tardivo`. Alla conferma la preview non viene considerata autorevole: Contratto e Pagamenti vengono ricaricati e i valori ricalcolati lato server.

### Comportamenti di dominio essenziali

`Contratto` espone:

- `siSovrapponeA`;
- `calcolaImportoCompetenza`;
- `calcolaScadenzaCompetenza`;
- `statoAlla`;
- `impostaContenuto`;
- `aggiungiPagamento`.

Nel Domain Model un Contratto registrato possiede sempre contenuto storico e almeno un Pagamento. Nel Class Diagram di design `contenuto` e i Pagamenti possono essere temporaneamente assenti durante l'assemblaggio in memoria; `RegistrazioneContrattoPort` accetta il Contratto solo dopo che entrambe le condizioni di completezza sono soddisfatte.

`Persona` espone operazioni coese per aggiornare i dati anagrafici, cambiare residenza e impostare il documento di riconoscimento; in UC-01 `id` e `codiceFiscale` restano invariati.

### Data corrente

`DataCorrenteProvider` è usato da entrambi i casi d'uso:

- UC-01 per valorizzare `registratoIl`;
- UC-02 per mese corrente, pagabilità, scadenza e tardività.

La data non viene fornita dal client.

## DIP e testabilità

Le dipendenze infrastrutturali vengono invertite quando esiste una necessità concreta di isolamento o sostituzione.

Esempi:

```text
RegistraContrattoService
        ↓
RegistrazioneContrattoPort
        ↑
implementazione PostgreSQL di RegistrazioneContrattoPort
```

```text
RegistraContrattoService
        ↓
GeneratoreDocumentoContratto
        ↑
implementazione HTML infrastructure
```

```text
RegistraPagamentoService
        ↓
PagamentoRepository
        ↑
implementazione PostgreSQL
```

```text
RegistraContrattoService / RegistraPagamentoService
        ↓
DataCorrenteProvider
        ↑
implementazione orologio di sistema
```

Questa struttura permette unit test Jest con stub/mock/fake senza database reale o orologio reale. Pochi integration test mirati verranno usati successivamente per mapping PostgreSQL e confine transazionale.

## Organizzazione fisica proposta

La responsabilità logica `interface` viene mappata fisicamente su `web`.

La baseline per Node.js è:

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
```

La struttura potrà essere raffinata durante il setup senza cambiare la Dependency Rule.

## Design pattern

I quattro pattern trattati nel corso sono stati valutati, ma nessuno viene introdotto esplicitamente nella versione 1.0.

- **Strategy:** non esiste una famiglia di algoritmi intercambiabili; 3+2 e 4+4 differiscono per dati (`durata`, `rinnovo`, template), non per algoritmo.
- **Factory Method:** non esistono famiglie di creazione intercambiabili che richiedano sottoclassi o creator specializzati.
- **Adapter:** non viene dichiarato un Adapter soltanto perché una classe implementa una porta. Un Adapter esplicito verrà introdotto soltanto se emergerà un contratto esterno incompatibile da tradurre.
- **Observer:** non esiste un meccanismo uno-a-molti di eventi/notifiche che lo giustifichi.

La scelta supporta OCP senza creare astrazioni preventive: i punti di variazione reali sono già isolati tramite porte, mentre nuove strategie o pattern verranno introdotti solo se l'implementazione farà emergere variabilità concreta.

## Tracciabilità fino ai componenti

| Requisiti / AC | Caso d'uso | Responsabilità principali |
|---|---|---|
| RF-01, RF-02, AC-04, AC-08, AC-09, RNF-01 | UC-01 | `RegistraContrattoService`, `BozzaContratto`, `BozzaContrattoRepository`, controllo della bozza residua |
| RF-03, AC-01, AC-02, AC-03 | UC-01 | `RegistraContrattoService`, `ImmobileRepository`, `PersonaRepository`, domain object coinvolti |
| RF-04, AC-05 | UC-01 | `RegistraContrattoService`, `TipologiaContrattualeRepository`, `Articolo`, `Contratto` |
| RF-05, AC-06 | UC-01 | `RegistraContrattoService`, `ContrattoRepository`, `Contratto.siSovrapponeA` |
| RF-06, AC-07, AC-09, RNF-04 | UC-01 | `RegistraContrattoService`, `GeneratoreDocumentoContratto`, `DataCorrenteProvider`, `RegistrazioneContrattoPort`, `BozzaContrattoRepository`, `Contratto` |
| RF-07, AC-10, AC-11 | UC-02 | `RegistraPagamentoService`, `ImmobileRepository`, `ContrattoRepository` |
| RF-08, AC-12, AC-14 | UC-02 | `RegistraPagamentoService`, `ContrattoRepository`, `PagamentoRepository`, `Contratto` |
| RF-09, AC-13 | UC-02 | `RegistraPagamentoService`, `Contratto`, `PagamentoRepository` |
| RF-10, AC-15 | UC-02 | `RegistraPagamentoService`, `PagamentoRepository` |
| RNF-02 | UC-01 / UC-02 | client-server semplice, backend monolitico layered, query orientate ai casi d'uso |
| RNF-03 | UC-01 / UC-02 | client e `web` per validazione di confine; `infrastructure` per dettagli tecnici |
| RNF-05 | UC-01 / UC-02 | browser / presentation |

## Review del design — esiti consolidati

### SRP di `RegistraContrattoService`

Il Service espone numerose operazioni perché rappresentano i passaggi dello stesso caso d'uso. Persistenza, generazione HTML, data corrente e regole di dominio sono delegate. Non viene suddiviso preventivamente in Service per step; la separazione verrà rivalutata solo se implementazione e test mostreranno metodi lunghi, responsabilità autonome o difficoltà concrete di isolamento.

### DIP

Le dipendenze infrastrutturali necessarie sono invertite tramite porte. Non vengono create interfacce per oggetti di dominio che non richiedono sostituibilità. La scelta di SQL esplicito con `pg` non altera il DIP perché `pg` compare soltanto nelle implementazioni `infrastructure`.

### OCP

Non vengono introdotte gerarchie o Strategy per tipologie contrattuali basate esclusivamente su dati. Il generatore del documento è invece dietro una porta perché il formato di output costituisce un punto di variazione reale e può evolvere, per esempio verso una futura esportazione PDF.

### `PagamentoRepository` e invarianti

La firma `salva(contrattoId, pagamento)` rende esplicita la relazione persistente senza duplicarla dentro `Pagamento`. Il caso d'uso invoca prima `Contratto.aggiungiPagamento`, così la persistenza non sostituisce le invarianti di dominio.

### Semplificazione di `Articolo` e rimozione di `ContrattoRegistrato`

Le copie valorizzate di `Articolo` e la classe 1:1 `ContrattoRegistrato` sono state eliminate perché duplicavano la rappresentazione storica. Il documento completo HTML è ora l'unico snapshot applicativo del testo contrattuale e viene conservato direttamente nel `Contratto`.

### Stato del Contratto

Non vengono persistiti flag `inEssere` o `scaduto`. Tali valori dipendono dalla data corrente e diventerebbero obsoleti senza una modifica del record. `Contratto.statoAlla(data)` mantiene la regola derivata nel dominio.

## Chiusura della fase di design

Le decisioni necessarie all'avvio della Fase 04 sono consolidate:

- stack applicativo;
- formato e persistenza della bozza;
- PostgreSQL e strategia di mapping;
- formato HTML del contenuto storico;
- responsabilità del Contratto registrato;
- porte e transazioni;
- decisione motivata sui pattern.

La Fase 03 è quindi considerata completata nella baseline corrente. Eventuali incoerenze emerse durante sviluppo e test verranno trattate come review e refactoring mirati, aggiornando insieme gli artefatti interessati.
