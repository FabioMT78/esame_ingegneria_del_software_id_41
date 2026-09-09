# Architettura e design — Gestionale Affitti

Questo documento raccoglie le decisioni architetturali e di design approvate per la versione 1.0 di **Gestionale Affitti**. La fase di progettazione è ancora in corso: vengono documentate soltanto le scelte già consolidate, mentre le decisioni non ancora assunte sono indicate esplicitamente come aperte.

## Stato della progettazione

La versione 1.0 resta focalizzata sui due casi d'uso core:

- **UC-01 — Registrare un contratto di locazione**;
- **UC-02 — Registrare il pagamento di un canone**.

Sono già consolidate:

- gli architectural drivers principali;
- lo stile architetturale client-server con backend monolitico layered;
- la separazione delle responsabilità tra `interface`, `application`, `domain` e `infrastructure`;
- la direzione delle dipendenze e l'applicazione del DIP verso la persistenza e la generazione del documento registrato;
- i componenti applicativi principali dei due casi d'uso;
- la rappresentazione applicativa e il ciclo di vita della bozza di UC-01;
- una prima granularità delle porte di persistenza;
- la distribuzione delle regole relative a periodo contrattuale, competenze mensili e importi pro-rata;
- la separazione tra valorizzazione degli articoli e generazione della copia storica del contratto.

Restano ancora da consolidare:

- il confine transazionale della registrazione definitiva di UC-01;
- il Class Diagram di design definitivo;
- l'eventuale adozione di design pattern;
- la persistenza concreta;
- il formato concreto della bozza e di `ContrattoRegistrato`;
- lo stack tecnologico e l'organizzazione fisica del progetto.

## Architectural drivers

### Requisiti funzionali core

UC-01 richiede una procedura guidata recuperabile, la gestione di dati esistenti e nuovi, controlli di duplicazione, verifica della sovrapposizione dei periodi contrattuali, valorizzazione degli articoli, creazione della copia storica del contratto e registrazione del primo pagamento.

UC-02 richiede l'individuazione della mensilità non pagata cronologicamente più vecchia fino al mese corrente, l'applicazione delle regole di pagabilità e scadenza, il calcolo automatico dell'importo e la registrazione del pagamento soltanto dopo conferma esplicita.

### Requisiti non funzionali rilevanti

- **RNF-01 — recuperabilità:** la bozza di UC-01 deve essere persistibile e recuperabile dopo un'interruzione.
- **RNF-02 — prestazioni:** le interazioni che coinvolgono il server devono restare semplici e proporzionate allo scope della versione 1.0.
- **RNF-03 — sicurezza:** la validazione client migliora l'interazione, ma il server resta responsabile della validazione autorevole e del trattamento sicuro degli input.
- **RNF-04 — coerenza:** un errore non deve lasciare dati parziali o incoerenti; la registrazione definitiva di UC-01 necessita quindi di un confine atomico.
- **RNF-05 — feedback:** lo stato di elaborazione e l'esito delle operazioni con attesa sono responsabilità della presentazione/client.

### Altri driver

- persistenza dei dati definitivi e della bozza;
- testabilità dei casi d'uso senza dipendere da database o dettagli tecnologici concreti;
- distinzione tra orchestrazione applicativa e regole di dominio;
- scope individuale limitato a due casi d'uso;
- mono-utenza della versione 1.0;
- possibilità di evoluzione successiva senza introdurre nella versione corrente scalabilità, microservizi o distribuzione non richiesti.

## Stile architetturale

### Problema

Il sistema è un'applicazione web e i requisiti distinguono esplicitamente client e server. Il backend deve inoltre separare interazione, orchestrazione, regole di dominio e persistenza senza introdurre la complessità di un'architettura distribuita.

### Scelta

La versione 1.0 adotta una combinazione di stili:

- **client-server** per il confine tra interfaccia web e backend;
- **layered** per l'organizzazione interna del backend;
- persistenza centralizzata, accessibile tramite porte dichiarate dal livello applicativo.

Il backend rimane un'unica applicazione monolitica dal punto di vista del deployment. La separazione interna in layer non implica microservizi né unità di rilascio indipendenti.

### Alternative considerate

Lo stile service-based non viene adottato perché i due casi d'uso non richiedono servizi indipendenti, scalabilità separata o deployment autonomi. Lo stile repository non viene assunto come stile architetturale principale: la persistenza centralizzata è presente, ma il problema dominante è la separazione delle responsabilità interne del backend.

### Trade-off

La separazione introduce più confini e alcune astrazioni iniziali. Il costo viene accettato per ottenere maggiore testabilità, sostituibilità della persistenza e chiarezza delle responsabilità in previsione dell'evoluzione del progetto.

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

Non contiene regole del dominio, query, transazioni o dettagli di persistenza.

### `application`

Coordina i casi d'uso e il loro workflow.

Responsabilità:

- decidere la sequenza delle operazioni;
- recuperare e persistere dati tramite porte;
- governare il ciclo di vita della bozza;
- invocare le regole di dominio;
- gestire successo ed errori applicativi;
- delimitare logicamente le operazioni che devono essere atomiche.

Non conosce HTTP, SQL, ORM o tecnologia del database.

### `domain`

Contiene gli oggetti e le regole stabili del dominio degli affitti.

Comprende i concetti già consolidati nella modellazione e i comportamenti necessari a esprimere regole come:

- calcolo della data finale del contratto;
- verifica dei vincoli del periodo;
- calcolo dell'importo delle competenze mensili;
- pro-rata della prima e dell'ultima mensilità;
- scadenza delle competenze;
- valorizzazione delle copie degli articoli registrati.

Non conosce UI, database, ORM o framework.

### `infrastructure`

Contiene i dettagli tecnici sostituibili.

Responsabilità previste:

- implementazioni concrete delle porte di persistenza;
- rappresentazione persistente della bozza;
- mapping e serializzazione;
- meccanismo tecnico della transazione;
- implementazione concreta della generazione del documento registrato;
- logging e altri dettagli infrastrutturali quando necessari.

Non contiene workflow dei casi d'uso né regole economiche o contrattuali.

### Direzione delle dipendenze

La direzione progettuale è:

```text
client
  ↓
interface
  ↓
application
  ↓
domain

application ─────→ port / repository interface
                       ↑
                       │ implementa
                 infrastructure
```

Il `domain` non dipende dalla persistenza. L'`application` dipende dalle astrazioni necessarie ai casi d'uso; le implementazioni concrete dell'infrastruttura dipendono dalle stesse astrazioni.

## Componenti applicativi dei casi d'uso

### `RegistraContrattoService`

**Responsabilità principale:** orchestrare UC-01.

Coordina:

- avvio e ripresa della procedura;
- validazione applicativa e avanzamento degli step;
- recupero o verifica dell'Immobile;
- identificazione di proprietario e inquilino;
- gestione della bozza;
- caricamento della tipologia contrattuale e degli articoli predefiniti;
- invocazione delle regole del `Contratto`;
- controllo della sovrapposizione usando dati recuperati tramite repository;
- valorizzazione degli articoli registrati;
- generazione del contenuto di `ContrattoRegistrato` tramite una porta dedicata;
- creazione del primo `Pagamento` usando l'importo determinato dal dominio;
- richiesta della registrazione definitiva;
- eliminazione della bozza soltanto dopo il successo della registrazione.

Non contiene query, serializzazione, rendering del documento o formule economiche duplicate.

### `RegistraPagamentoService`

**Responsabilità principale:** orchestrare UC-02.

Coordina:

- selezione dell'immobile e dell'inquilino;
- recupero dei contratti e dei pagamenti esistenti;
- individuazione della competenza non pagata cronologicamente più vecchia fino al mese corrente;
- esclusione di competenze già pagate o future;
- richiesta al `Contratto` dell'importo e della scadenza della competenza;
- preparazione dei dati mostrati al proprietario;
- creazione del `Pagamento` soltanto dopo conferma;
- richiesta di persistenza del pagamento.

La data corrente deve essere resa esplicita e controllabile dal lato server, in modo da consentire test deterministici. La forma tecnica con cui verrà fornita sarà definita insieme allo stack.

## Regole delle competenze mensili

Non viene introdotta una classe software autonoma `Mensilita` nella versione corrente.

Le regole temporali ed economiche sono responsabilità del `Contratto`, che dispone dei dati necessari: `dal`, `al`, `canoneMensile` e `giornoPagamento`.

Le regole approvate sono:

- `dal` e `al` sono inclusivi;
- una competenza interamente compresa nel periodo ha importo pari a `canoneMensile`;
- la prima competenza è calcolata in pro-rata quando `dal` non coincide con il primo giorno del mese;
- l'ultima competenza è calcolata in pro-rata quando `al` non coincide con l'ultimo giorno del mese;
- la formula è `canoneMensile * giorniCoperti / giorniDelMese`;
- non vengono effettuati arrotondamenti intermedi;
- il risultato finale è arrotondato a due cifre decimali;
- il pro-rata rappresenta l'importo completo dovuto per il periodo coperto e non costituisce un pagamento parziale.

L'individuazione della competenza non ancora pagata resta invece responsabilità di `RegistraPagamentoService`, perché richiede il confronto tra il periodo del contratto, i `Pagamento` persistiti e la data corrente.

L'estrazione futura di un oggetto software dedicato alla mensilità resta possibile se la complessità delle regole crescerà.

## Valorizzazione degli articoli e copia storica

### `ValorizzaArticoliService`

È un domain service focalizzato sulla creazione di copie valorizzate degli `Articolo` predefiniti della tipologia contrattuale.

Responsabilità:

- ricevere articoli predefiniti e dati definitivi del contratto;
- produrre copie distinte valorizzate;
- non dipendere dal database;
- non decidere quando registrare il contratto.

### `GeneratoreContrattoRegistrato`

È una porta dichiarata nell'application layer.

Responsabilità:

- produrre il contenuto completo della copia storica del contratto a partire dai dati definitivi e dagli articoli valorizzati.

L'application layer non conosce il formato concreto né la tecnologia utilizzata per generarlo. Una futura implementazione infrastrutturale potrà produrre testo, Markdown, PDF o altra rappresentazione coerente con la decisione tecnologica successiva.

`ContrattoRegistrato` rimane un oggetto del dominio e conserva il contenuto immutabile generato al momento della registrazione.

## Bozza di UC-01

### Problema

La procedura di registrazione deve sopravvivere a interruzioni e deve contenere anche nuovi Immobili, Persone e dati di riconoscimento non ancora persistiti definitivamente.

### Scelta

`BozzaContratto` è un **application model dedicato**, non un'entità del Domain Model e non una versione incompleta di `Contratto`.

Rappresenta lo stato validato finora della procedura, incluso lo step raggiunto e i dati acquisiti nei passaggi completati.

`RegistraContrattoService` crea, aggiorna, recupera ed elimina logicamente la bozza attraverso `BozzaContrattoRepository`.

### Ciclo di vita

- dopo il primo step valido la bozza viene creata;
- dopo ogni step valido viene aggiornata;
- alla riapertura di UC-01 viene recuperata l'eventuale bozza corrente;
- l'annullamento elimina la bozza;
- un errore nella registrazione definitiva non elimina la bozza;
- la bozza viene eliminata soltanto dopo il successo della registrazione definitiva.

### Persistenza

La forma persistente della bozza è responsabilità esclusiva dell'infrastruttura. L'application layer conosce soltanto `BozzaContratto` e la porta `BozzaContrattoRepository`.

La versione 1.0 è mono-utente: non vengono quindi introdotti identificatori utente, query per utente o gestione di più bozze concorrenti.

## Porte di persistenza

La persistenza viene esposta tramite un numero limitato di interfacce coerenti con i casi d'uso. Non viene creato un repository per ogni classe del Domain Model e non viene mantenuto il generico ruolo `Archivio dati` come singolo repository globale.

### `BozzaContrattoRepository`

Usato da `RegistraContrattoService`.

Operazioni concettuali minime:

```text
recupera()
salva(bozza)
elimina()
```

### `ImmobileRepository`

Usato per selezione e recupero degli immobili e per interrogare lo stato persistito necessario ai controlli di duplicazione catastale e, quando previsto, dell'indirizzo completo.

Il repository risponde a domande sui dati persistiti; non decide se il workflow può avanzare.

### `PersonaRepository`

Usato per identificare una Persona tramite codice fiscale e recuperare l'eventuale soggetto già registrato.

Non vengono aggiunte operazioni CRUD non richieste dai casi d'uso correnti.

### `TipologiaContrattualeRepository`

Usato per recuperare le tipologie contrattuali e i relativi articoli predefiniti necessari a UC-01.

Non viene introdotto un `ArticoloRepository` autonomo, perché gli articoli predefiniti sono caricati nel contesto della tipologia e le copie valorizzate sono registrate nel contesto del contratto definitivo.

### `ContrattoRepository`

Usato da entrambi i casi d'uso per recuperare i contratti necessari.

In UC-01 fornisce i contratti relativi all'immobile; la regola di sovrapposizione resta nel dominio. Non viene attribuita al repository la decisione sul significato della sovrapposizione.

Le operazioni di scrittura definitiva di UC-01 non sono ancora fissate perché dipendono dalla decisione sul confine transazionale.

### `PagamentoRepository`

Usato soprattutto da `RegistraPagamentoService` per recuperare la storia dei pagamenti del contratto e per registrare un nuovo `Pagamento` in UC-02.

È mantenuto distinto da `ContrattoRepository` perché UC-02 ha come obiettivo esplicito la registrazione di un pagamento e la storia dei pagamenti costituisce una responsabilità persistente coerente e potenzialmente evolvibile.

## Entità senza repository autonomo

Nella versione 1.0 non vengono introdotte porte dedicate per:

- `Indirizzo`;
- `DatiCatastali`;
- `DocumentoRiconoscimento`;
- `Articolo`;
- `ContrattoRegistrato`.

Questi concetti restano autonomi nel Domain Model, ma i due casi d'uso non li gestiscono come risorse persistenti indipendenti.

### Evoluzione della persistenza degli indirizzi

`Indirizzo` è già un concetto di dominio autonomo e condiviso da `Persona` e `Immobile`. L'assenza di un `IndirizzoRepository` non implica che i suoi attributi debbano essere memorizzati direttamente nelle tabelle o strutture persistenti di `Persona` e `Immobile`.

L'infrastruttura potrà adottare una rappresentazione normalizzata dedicata, ad esempio mantenendo riferimenti dalla Persona alla residenza e dall'Immobile alla propria ubicazione. In questo modo l'organizzazione persistente potrà evitare duplicazioni strutturali e permettere alle implementazioni dei repository di recuperare soltanto i dati necessari alle singole operazioni.

Una futura versione potrebbe distinguere, ad esempio, residenza e domicilio o gestire più indirizzi e relativo storico. Tale evoluzione potrà richiedere nuove associazioni nel dominio e, soltanto se emergeranno casi d'uso autonomi sugli indirizzi, una specifica porta di persistenza.

La versione 1.0 privilegia quindi interfacce applicative proporzionate ai casi d'uso correnti senza vincolare prematuramente lo schema fisico del database.

## DIP e testabilità

Le dipendenze infrastrutturali vengono invertite quando esiste una necessità concreta di isolamento o sostituzione.

Esempi principali:

```text
RegistraContrattoService
        ↓
BozzaContrattoRepository <<interface>>
        ↑
implementazione infrastructure
```

```text
RegistraPagamentoService
        ↓
PagamentoRepository <<interface>>
        ↑
implementazione infrastructure
```

```text
RegistraContrattoService
        ↓
GeneratoreContrattoRegistrato <<interface>>
        ↑
implementazione infrastructure
```

Questa struttura permette di testare i Service con fake, stub o mock senza richiedere database o generazione reale del documento. La scelta del tipo di test double verrà effettuata nella fase di testing in base al comportamento da verificare.

## Organizzazione logica dei package

La struttura fisica dipenderà dal linguaggio scelto, ma il design corrente prevede una separazione logica equivalente a:

```text
interface/

application/
  RegistraContrattoService
  RegistraPagamentoService
  model/
    BozzaContratto
  ports/
    BozzaContrattoRepository
    ImmobileRepository
    PersonaRepository
    TipologiaContrattualeRepository
    ContrattoRepository
    PagamentoRepository
    GeneratoreContrattoRegistrato

domain/
  Persona
  Immobile
  Indirizzo
  DatiCatastali
  DocumentoRiconoscimento
  TipologiaContrattuale
  Articolo
  Contratto
  ContrattoRegistrato
  Pagamento
  services/
    ValorizzaArticoliService

infrastructure/
  persistence/
  document/
  logging/
```

La struttura è indicativa e descrive responsabilità, non package o namespace definitivi dello stack.

## Tracciabilità fino ai componenti

| Requisiti / AC | Caso d'uso | Responsabilità principali |
|---|---|---|
| RF-01, RF-02, AC-04, AC-08, AC-09, RNF-01 | UC-01 | `RegistraContrattoService`, `BozzaContratto`, `BozzaContrattoRepository` |
| RF-03, AC-01, AC-02, AC-03 | UC-01 | `RegistraContrattoService`, `ImmobileRepository`, `PersonaRepository`, domain object coinvolti |
| RF-04, AC-05 | UC-01 | `RegistraContrattoService`, `TipologiaContrattualeRepository`, `Contratto`, `ValorizzaArticoliService` |
| RF-05, AC-06 | UC-01 | `RegistraContrattoService`, `ContrattoRepository`, regola di dominio sulla sovrapposizione |
| RF-06, AC-07, RNF-04 | UC-01 | `RegistraContrattoService`, `GeneratoreContrattoRegistrato`, `ContrattoRegistrato`, porte di persistenza; confine transazionale ancora da definire |
| RF-07, AC-10, AC-11 | UC-02 | `RegistraPagamentoService`, `ImmobileRepository`, `ContrattoRepository` |
| RF-08, AC-12, AC-14 | UC-02 | `RegistraPagamentoService`, `ContrattoRepository`, `PagamentoRepository`, `Contratto` |
| RF-09, AC-13 | UC-02 | `RegistraPagamentoService`, `Contratto`, `PagamentoRepository` |
| RF-10, AC-15 | UC-02 | `RegistraPagamentoService`, `PagamentoRepository` |
| RNF-02 | UC-01 / UC-02 | client-server semplice, backend monolitico layered, query orientate ai casi d'uso |
| RNF-03 | UC-01 / UC-02 | client e `interface` per validazione di confine; `infrastructure` per dettagli di logging/persistenza |
| RNF-05 | UC-01 / UC-02 | client / presentation |

## Decisioni ancora aperte

Prima di considerare completa la fase di design devono essere ancora definiti:

- il confine transazionale della registrazione definitiva di UC-01 e le relative operazioni di scrittura;
- le firme pubbliche essenziali delle classi e delle porte;
- `uml/class-diagram-design.puml`;
- la review esplicita di SRP, DIP e OCP sul design completo;
- la decisione motivata sull'uso o non uso di Strategy, Factory Method, Adapter e Observer;
- il formato persistente della bozza;
- il formato concreto del contenuto di `ContrattoRegistrato`;
- il database e la strategia generale di mapping/persistenza;
- linguaggio/backend, tipo di client e stack tecnologico.
