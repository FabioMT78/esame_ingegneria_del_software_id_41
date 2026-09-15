# Architettura e design — Gestionale Affitti

Questo documento descrive le decisioni architetturali e di design della versione 1.0 di **Gestionale Affitti**. I requisiti e i criteri di accettazione sono definiti in `docs/requisiti.tex`; le decisioni di modellazione e gli UML sono documentati in `docs/modellazione.md` e nella cartella `uml/`. Il dettaglio eseguibile di codice, schema dati e configurazione rimane nei rispettivi artefatti del repository.

## 1. Obiettivo e architectural drivers

L'architettura deve supportare due casi d'uso core:

- **UC-01 — Registrare un contratto di locazione**;
- **UC-02 — Registrare il pagamento di un canone**.

Le decisioni architetturali sono guidate soprattutto da questi vincoli:

- separare orchestrazione applicativa, regole di dominio, interazione HTTP e persistenza;
- rendere recuperabile lo stato temporaneo della procedura guidata di UC-01;
- consentire la presenza di più bozze di UC-01 senza confonderne il lifecycle;
- garantire coerenza e atomicità dei dati definitivi registrati da UC-01;
- mantenere il server autorevole per validazione, data corrente e dati persistiti;
- rendere testabili i casi d'uso senza richiedere database, filesystem o orologio reale nei test unitari;
- mantenere uno scope individuale contenuto, evitando distribuzione e complessità non richieste;
- utilizzare un ambiente locale riproducibile.

Le regole comportamentali complete restano nella specifica dei requisiti e negli UML. Questo documento ne considera soltanto le conseguenze sul design.

## 2. Stile architetturale

### Problema

Il sistema è un'applicazione web e deve separare interazione, orchestrazione dei casi d'uso, regole di dominio e dettagli infrastrutturali senza introdurre la complessità di un sistema distribuito.

### Scelta

La versione 1.0 combina due stili:

- **client-server** per il confine tra browser e backend;
- **layered** per l'organizzazione interna del backend.

Il backend è un'unica applicazione monolitica dal punto di vista del deployment. La persistenza è centralizzata e viene raggiunta dall'application layer attraverso porte dedicate.

L'esecuzione di applicazione e PostgreSQL in container distinti non introduce microservizi: il database rimane una dipendenza infrastrutturale del singolo backend.

### Alternative considerate

Uno stile service-based non è giustificato dai due casi d'uso, che non richiedono deployment indipendenti, scalabilità separata o comunicazione tra servizi autonomi.

Lo stile repository non viene assunto come stile architetturale principale: la persistenza centralizzata è presente, ma il problema principale da risolvere è la separazione delle responsabilità interne del backend.

### Trade-off

Il layering introduce più confini e alcune astrazioni rispetto a una struttura più diretta. Il costo è accettato perché migliora chiarezza delle responsabilità, testabilità e sostituibilità dei dettagli infrastrutturali. Non vengono introdotti ulteriori layer senza una responsabilità concreta.

## 3. Layer e Dependency Rule

Il backend è organizzato secondo quattro responsabilità logiche.

### `interface`

Rappresenta il confine di ingresso del server. Nell'organizzazione fisica corrisponde alla cartella `src/web`.

Responsabilità principali:

- ricevere le richieste dal client;
- applicare controlli tecnici e formali sugli input;
- applicare una prima rilevazione trasversale di pattern sospetti riconducibili a XSS e SQL injection prima dei controller;
- trasformare i dati ricevuti nella forma richiesta dall'application layer;
- invocare il caso d'uso corretto;
- tradurre gli esiti applicativi nella risposta verso il client.

Non contiene regole di dominio, query SQL o gestione delle transazioni.

### `application`

Coordina i casi d'uso e il loro workflow.

Responsabilità principali:

- orchestrare la sequenza delle operazioni;
- recuperare e persistere dati tramite porte;
- governare lo stato temporaneo necessario ai casi d'uso;
- invocare le regole del dominio;
- gestire successo ed errori applicativi;
- delimitare logicamente le operazioni che devono essere atomiche.

Non dipende da HTTP, SQL, `pg`, PostgreSQL o Docker.

### `domain`

Contiene gli oggetti e le regole stabili del dominio degli affitti.

Le regole economiche e temporali delle competenze, i vincoli sul periodo contrattuale e le invarianti dei pagamenti sono responsabilità del dominio. `Articolo` rappresenta esclusivamente il template contrattuale e non viene copiato nel Contratto registrato.

Il domain non conosce UI, database, SQL, framework o formati di persistenza.

### `infrastructure`

Contiene i dettagli tecnici sostituibili:

- implementazioni PostgreSQL delle porte;
- query e mapping tra record e oggetti;
- serializzazione della bozza;
- pool e connessioni `pg`;
- gestione tecnica delle transazioni;
- generazione concreta del documento HTML;
- sorgente concreta della data corrente.

Non contiene workflow dei casi d'uso né regole economiche o contrattuali.

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

Il composition root è confinato in `src/web/compositionRoot.ts`: è il punto in cui il processo costruisce il pool PostgreSQL, le implementazioni concrete delle porte, i provider infrastrutturali, `RegistraContrattoService` e `RegistraPagamentoService`, per poi passarli al confine Express. Non contiene regole applicative; la sua responsabilità è esclusivamente assemblare il grafo delle dipendenze. `server.ts` resta invece il bootstrap del processo e gestisce ascolto HTTP e chiusura ordinata delle risorse.

### Sicurezza trasversale del confine HTTP

#### Problema

La sicurezza applicativa completa non rientra nello scope funzionale della versione 1.0. Il confine HTTP deve comunque rimanere autorevole sulla validazione dei dati ricevuti e non può affidarsi ai controlli del browser. Oltre alle protezioni contestuali già necessarie per persistenza e rendering, è stato introdotto un controllo server-side aggiuntivo e circoscritto per riconoscere alcuni pattern comuni riconducibili a XSS o SQL injection.

#### Scelta

Le richieste dirette alle route `/api` attraversano `SicurezzaInputHttpMiddleware` dopo il parsing JSON e prima dei controller. Il middleware conosce Express e delega l'analisi a `SicurezzaInputService`, che non dipende dal framework HTTP e attraversa ricorsivamente path, query string e body JSON alla ricerca di un insieme iniziale e intenzionalmente limitato di pattern sospetti.

La versione 1.0 riconosce dieci famiglie dimostrative di pattern, suddivise tra XSS e SQL injection. Quando viene rilevata una corrispondenza, la richiesta viene rifiutata con errore HTTP 400 e viene prodotto un log tecnico che riporta metodo, origine del valore, categoria e pattern rilevato. Il valore destinato al log viene limitato in lunghezza e reso sicuro rispetto ai caratteri di markup. Il controllo è esclusivamente server-side: eventuali validazioni del browser rimangono controlli di usabilità e non sono considerate una barriera di sicurezza.

Il controllo trasversale non sostituisce le altre difese:

- `Uc01HttpInput` e `Uc02HttpInput` continuano a validare forma, tipo e significato degli input richiesti dai rispettivi casi d'uso;
- il dominio continua a proteggere le proprie invarianti e a normalizzare i valori che hanno una semantica specifica, come codice fiscale e IBAN;
- la persistenza PostgreSQL continua a usare query parametrizzate, che impediscono ai valori ricevuti di diventare parte della sintassi SQL;
- `GeneratoreDocumentoHtmlContratto` continua a eseguire escaping contestuale dei dati inseriti nell'HTML.

#### Alternative considerate

È stata scartata una sanitizzazione globale e distruttiva che rimuova indiscriminatamente apostrofi, virgolette, parentesi angolari o altre sequenze dai valori ricevuti. Tale soluzione potrebbe alterare dati legittimi e confondere la rilevazione preventiva con le protezioni necessarie nel punto effettivo di utilizzo del dato.

#### Trade-off

Il riconoscimento tramite espressioni regolari è volutamente euristico: non costituisce un Web Application Firewall e non pretende di coprire tutte le varianti reali di XSS o SQL injection. Il vantaggio, nello scope didattico della versione 1.0, è una barriera piccola, centralizzata e direttamente testabile. Il costo è la possibilità di falsi positivi o falsi negativi, mitigata dal fatto che le protezioni contestuali restano comunque attive.

## 4. Componenti applicativi e responsabilità

### `RegistraContrattoService`

Ha la responsabilità principale di orchestrare UC-01.

Coordina la procedura guidata, il recupero dei dati necessari, la gestione delle bozze, l'invocazione delle regole del `Contratto`, il controllo della sovrapposizione, l'acquisizione della data corrente, la generazione del contenuto storico e la registrazione definitiva.

Più bozze possono coesistere nella versione 1.0. Ogni operazione che modifica, conferma o annulla una procedura già iniziata identifica esplicitamente la relativa bozza, evitando che un'operazione su un contratto in preparazione modifichi lo stato temporaneo di un altro. All'avvio il Service individua le bozze riprendibili ed elimina soltanto quelle riconosciute come residue di una registrazione già completata.

Dopo il completamento dei quattro step di acquisizione, il Service può costruire un `Contratto` transitorio dalla bozza completa per produrre l'anteprima del riepilogo. L'operazione `anteprima(idBozza)` rivalida i dati dipendenti dalla data corrente e invoca lo stesso `GeneratoreDocumentoContratto` usato dalla conferma, ma non imposta contenuto storico, non crea Pagamenti e non esegue scritture definitive. Alla conferma il `Contratto` viene costruito nuovamente dai dati correnti della bozza, viene eseguito il controllo di sovrapposizione e il documento viene rigenerato prima della registrazione definitiva. In questo modo l'anteprima non diventa fonte autorevole e non può divergere per una logica di rendering separata.

Persistenza, generazione HTML, data corrente e regole di dominio sono delegate ai rispettivi collaboratori; il Service non contiene query, serializzazione, rendering concreto o formule economiche duplicate.

Una Persona già registrata può essere trattata nella procedura come working copy dei dati modificabili, mentre `id` e `codiceFiscale` restano invariati. L'inserimento diretto di una nuova Persona salta soltanto la ricerca preliminare: il Service verifica comunque che il codice fiscale non appartenga già a una Persona definitiva. Un Immobile già registrato viene selezionato ma non modificato da UC-01.

### `RegistraPagamentoService`

Ha la responsabilità principale di orchestrare UC-02.

Coordina il recupero dei dati persistiti, individua la competenza non ancora pagata che il caso d'uso deve proporre, richiede al `Contratto` importo e scadenza, prepara la preview e, dopo conferma, ricarica e rivalida i dati autorevoli prima di creare e registrare il `Pagamento`.

La data corrente viene ottenuta tramite `DataCorrenteProvider` e non viene fornita dal client.

### Application model

`BozzaContratto` e `PagamentoDaRegistrare` appartengono all'application layer e non al Domain Model.

`BozzaContratto` rappresenta lo stato temporaneo e recuperabile di una singola procedura di UC-01. Non è un `Contratto` incompleto e non contiene il documento storico o Pagamenti definitivi. Possiede un `idBozza` tecnico che consente di distinguere più workflow temporanei dello stesso utente; l'identificatore non introduce un nuovo concetto del dominio degli affitti.

`PagamentoDaRegistrare` rappresenta i dati necessari alla preview di UC-02. Non costituisce una fonte autorevole alla conferma: i dati persistiti vengono ricaricati e ricalcolati dal server.

## 5. Porte e dipendenze

Le porte sono orientate ai bisogni dei casi d'uso e non alle singole tabelle del database.

### Porte di persistenza

- `BozzaContrattoRepository` isola elenco, recupero, salvataggio ed eliminazione delle bozze di UC-01 e consente di verificare se esiste già una bozza relativa a un Immobile registrato.
- `ImmobileRepository` consente selezione e recupero degli immobili e supporta i controlli sui dati persistiti necessari ai casi d'uso.
- `PersonaRepository` consente l'identificazione e il recupero delle Persone registrate.
- `TipologiaContrattualeRepository` fornisce tipologie contrattuali e relativi articoli template; non viene introdotto un `ArticoloRepository` autonomo perché gli articoli sono sempre letti nel contesto della tipologia.
- `ContrattoRepository` fornisce i Contratti necessari ai due casi d'uso e offre, per UC-01, una verifica mirata dell'esistenza di una sovrapposizione per Immobile e intervallo. Il significato della sovrapposizione resta una regola del dominio; il repository evita soltanto di caricare tutti i Contratti quando è sufficiente una ricerca di esistenza sui dati persistiti.
- `PagamentoRepository` isola la scrittura del nuovo Pagamento di UC-02. I Pagamenti già registrati vengono letti insieme al `Contratto` tramite `ContrattoRepository`, che ricostruisce l'aggregato necessario al caso d'uso. Prima della persistenza il nuovo pagamento viene sottoposto alle invarianti del `Contratto`.
- `RegistrazioneContrattoPort` rappresenta l'operazione di scrittura definitiva e atomica di UC-01.

Per UC-02 `PagamentoRepository` è volutamente una porta orientata alla sola scrittura. Il `ContrattoRepository` già ricostruisce i `Contratto` con i Pagamenti storici necessari per individuare e rivalidare la competenza; introdurre anche una lettura autonoma dei Pagamenti nella seconda porta duplicherebbe query e mapping e creerebbe due possibili fonti applicative dello stesso stato. L'alternativa considerata era una porta `PagamentoRepository` simmetrica di lettura e scrittura, ma nello scope attuale non aggiunge una responsabilità utile. Il trade-off è una porta asimmetrica, accettato perché le porte sono definite sui bisogni dei casi d'uso e non come CRUD delle tabelle.

Le firme pubbliche e le relazioni precise sono rappresentate nel Class Diagram e nel codice.

### Altre porte applicative

`GeneratoreDocumentoContratto` isola la produzione del documento HTML dal caso d'uso. Nella versione 1.0 la stessa implementazione viene usata sia per l'anteprima valorizzata del riepilogo sia per il documento definitivo: cambia il contesto applicativo, non la logica di rendering. L'anteprima opera su un `Contratto` transitorio costruito dalla bozza e non viene persistita; alla conferma il documento viene rigenerato dai dati finali rivalidati e solo quel risultato viene conservato come contenuto storico.

`DataCorrenteProvider` isola la sorgente della data corrente. È condiviso dai due casi d'uso e permette al server di rimanere autorevole mantenendo i test deterministici.

## 6. Persistenza e decisioni sui dati

### Strategia generale

La persistenza usa **PostgreSQL** tramite SQL esplicito e driver `pg`. Non viene introdotto un ORM: query e mapping sono dettagli dell'infrastruttura e non devono propagarsi nell'application o nel domain layer.

I dati definitivi sono conservati in forma relazionale. Lo schema e i dati iniziali sono versionati nella cartella `db/`, che costituisce la fonte autorevole per colonne, chiavi, `CHECK`, `UNIQUE`, foreign key e altri dettagli SQL.

Gli identificatori persistenti sono tecnici e separati dalle chiavi naturali del dominio. Nella versione 1.0 vengono rappresentati come `int`; non sono necessari UUID o identificatori distribuiti.

### Seed dei template contrattuali

Le due `TipologiaContrattuale` supportate e i relativi `Articolo` iniziali sono versionati come
file JSON in `db/seed/template/`. I JSON sono dati di configurazione iniziale, non codice di
dominio e non vengono letti direttamente durante l'esecuzione dei casi d'uso: una utility
infrastrutturale li valida e li trasferisce nelle tabelle relazionali prima dell'utilizzo
dell'applicazione.

Il seed identifica una tipologia tramite la sua denominazione, ne aggiorna durata e rinnovo e
riallinea l'insieme degli articoli al contenuto versionato. L'operazione è idempotente e
transazionale: rilanciarla non crea duplicati e un errore non lascia una tipologia caricata solo
parzialmente. La sostituzione degli articoli è accettabile perché nella versione 1.0 essi sono
template configurativi e i Contratti già registrati mantengono comunque il proprio
`contenuto` storico indipendente.

Non viene introdotta una porta applicativa per il seed: si tratta di una responsabilità di setup
dell'infrastruttura, esterna al workflow di UC-01 e UC-02.

### `BozzaContratto` e JSONB

La bozza è l'unica struttura persistita come documento JSONB. Questa scelta è coerente con la sua natura di application model temporaneo, composto da dati eterogenei necessari alla ripresa del workflow e non ancora trasformati in stato definitivo del dominio.

La serializzazione è responsabilità dell'infrastruttura e usa mapping esplicito tra `BozzaContratto` e plain JSON, senza serializzare automaticamente il grafo interno degli oggetti applicativi e di dominio.

La versione 1.0 è mono-utente ma può mantenere più bozze attive. Il requisito mono-utente evita la necessità di associare le bozze a identità o sessioni di utenti diversi, ma non implica che possa esistere un solo contratto in preparazione. `idBozza` è quindi un identificatore tecnico del workflow temporaneo.

Per un Immobile già registrato può esistere al massimo una bozza attiva, così da non mantenere due procedure concorrenti riferite allo stesso bene. Una bozza relativa a un Immobile nuovo può invece esistere prima che tale Immobile possieda un identificatore persistente: i dati del nuovo bene rimangono nel JSONB fino alla conferma definitiva.

### Periodo del `Contratto`

La data `al` viene determinata automaticamente dalla regola di dominio a partire da `dal` e dalla durata iniziale della `TipologiaContrattuale` quando i dati contrattuali vengono validati. Da quel momento il periodo `dal`--`al` fa parte dello stato della bozza e, alla registrazione, dello stato storico del `Contratto`.

Entrambe le date vengono conservate nella persistenza relazionale. Pur essendo `al` un valore calcolato all'origine, conservarlo evita di ricostruire il periodo da dati configurabili della tipologia durante le letture e rende dirette le ricerche per intervallo o scadenza.

La regola secondo cui due periodi relativi allo stesso Immobile non possono sovrapporsi resta nel dominio. Per verificare la registrabilità di un nuovo periodo, l'application layer richiede al `ContrattoRepository` una ricerca mirata di esistenza sulla tripla Immobile, `dal`, `al`, anziché caricare tutti i Contratti dell'Immobile e filtrarli in memoria. Non viene introdotto un vincolo PostgreSQL avanzato specifico per gli intervalli: nello scope mono-utente della versione 1.0 la query mirata mantiene la soluzione semplice e la regola esplicita nel dominio. Il trade-off accettato è che un eventuale scenario futuro con scritture realmente concorrenti richiederebbe rivalutare anche la protezione a livello di persistenza.

### Articoli template e contenuto storico

`Articolo` rappresenta esclusivamente il template della `TipologiaContrattuale`. La suddivisione di un articolo logico in parti ordinate permette al generatore di inserire i valori dinamici senza creare copie valorizzate degli articoli associate al Contratto.

Nella versione 1.0 i punti di inserimento dei dati dinamici sono dichiarati direttamente nel testo del template tramite placeholder espliciti con forma `{{nome}}`, usando nomi qualificati come `{{contratto.canoneMensile}}`, `{{contratto.dal}}`, `{{proprietario.codiceFiscale}}`, `{{proprietario.iban}}` o `{{inquilino.documento.numero}}`. Il generatore mantiene una lista chiusa di placeholder supportati: un placeholder sconosciuto rende la generazione non valida invece di produrre silenziosamente un documento incompleto. I numeri di articolo e parte determinano esclusivamente ordine e raggruppamento e non vengono usati come convenzione implicita per decidere quale valore inserire.

Il generatore distingue i dati autorevoli dai valori di presentazione. `Contratto.canoneAnnuale` è derivato
dal canone mensile e non viene persistito separatamente; le forme testuali degli importi sono prodotte
dall'infrastruttura documentale. Analogamente, quando un template riporta un deposito cauzionale pari a
tre mensilità, il relativo importo viene derivato soltanto durante il rendering e non diventa stato del
Contratto o del database. L'IBAN, invece, è un dato opzionale della Persona e viene risolto dal placeholder
`proprietario.iban` in base al ruolo assunto nel Contratto.

Il testo dei template è trattato come testo e non come HTML arbitrario. `GeneratoreDocumentoHtmlContratto` esegue l'escaping sia dei template sia dei valori dinamici prima di produrre l'HTML, evitando che dati provenienti dal workflow vengano interpretati come markup. Le date di calendario vengono rese nel documento nel formato stabile `YYYY-MM-DD`; il formato appartiene al rendering e non modifica la rappresentazione `Date` usata da dominio e application layer.

Il `Contratto` conserva direttamente la propria copia storica completa tramite `registratoIl` e `contenuto`. Non viene mantenuta una classe separata `ContrattoRegistrato`, perché non possiede un lifecycle o un comportamento autonomo che giustifichi una relazione 1:1 distinta.

Nella versione 1.0 `contenuto` è HTML persistito come `TEXT`. Prima della conferma il backend può restituire al browser un'anteprima HTML valorizzata, mostrata in un contesto isolato e non salvata come stato definitivo. Il contenuto storico viene invece rigenerato lato server alla conferma definitiva e non viene ricostruito in seguito dai template o dai dati sorgente: questo ne preserva il significato storico. Un'eventuale futura esportazione PDF può essere aggiunta senza modificare questa responsabilità.

## 7. Confine transazionale di UC-01

### Problema

Alla conferma di UC-01 devono diventare persistenti in modo coerente più dati collegati. Un errore non deve lasciare stato definitivo parziale, mentre un eventuale errore successivo nella cancellazione della bozza non deve invalidare una registrazione già completata né coinvolgere bozze appartenenti ad altre procedure.

### Scelta

`RegistraContrattoService` costruisce lo stato definitivo soltanto alla conferma, valorizza la data di registrazione, genera il contenuto storico, crea il primo Pagamento e delega la scrittura a `RegistrazioneContrattoPort`.

L'implementazione PostgreSQL esegue la registrazione definitiva usando una singola connessione e una singola transazione:

```text
BEGIN
  sincronizzazione dei dati definitivi collegati
  inserimento del Contratto
  inserimento del primo Pagamento
COMMIT
```

A qualsiasi errore prima del commit viene eseguito `ROLLBACK`.

La cancellazione della specifica bozza confermata viene tentata **solo dopo** il commit e non appartiene alla transazione dei dati definitivi. Se la registrazione fallisce, quella bozza resta disponibile; se il commit riesce ma il cleanup fallisce, il Contratto rimane valido. Le altre bozze non sono coinvolte.

### Alternative considerate

Una Unit of Work generica è stata scartata perché introdurrebbe flessibilità non necessaria allo scope. È stata scartata anche l'inclusione del cleanup della bozza nella transazione definitiva, perché renderebbe un errore secondario capace di invalidare un risultato applicativo già corretto.

## 8. SOLID e testabilità

### SRP

Le responsabilità sono separate per motivo di cambiamento:

- il layer `web` cambia per esigenze di interazione HTTP/presentation;
- i Service cambiano quando cambia l'orchestrazione dei casi d'uso;
- il dominio cambia quando cambiano le regole del dominio;
- l'infrastruttura cambia quando cambiano database, mapping, generazione concreta del documento o altri dettagli tecnici.

Nel boundary HTTP, `SicurezzaInputHttpMiddleware` ha la responsabilità di intercettare le richieste e tradurre una rilevazione sospetta nel normale flusso di errore Express, mentre `SicurezzaInputService` ha la sola responsabilità di ispezionare i valori e classificare i pattern riconosciuti. In questo modo la logica di rilevazione rimane testabile senza costruire una richiesta HTTP.

`RegistraContrattoService` non viene suddiviso preventivamente in un Service per ogni step: i passaggi appartengono allo stesso caso d'uso. Una separazione ulteriore sarebbe giustificata soltanto da responsabilità realmente autonome emerse nel codice.

### DIP

L'application layer dipende da porte quando una dipendenza infrastrutturale deve essere sostituibile o isolabile. In particolare persistenza, generazione del documento e data corrente sono raggiunte tramite astrazioni definite per i bisogni dei casi d'uso.

Le implementazioni concrete dipendono da tali contratti, mentre `pg`, PostgreSQL e l'orologio di sistema restano confinati nell'infrastruttura.

Non vengono create interfacce per oggetti di dominio che non richiedono sostituibilità.

### OCP

Non vengono introdotte gerarchie o Strategy per tipologie contrattuali che differiscono soltanto per dati come durata, rinnovo e template.

Il generatore del documento è invece dietro una porta perché il formato di output rappresenta un punto di variazione reale: una futura implementazione può aggiungere un formato differente senza spostare tale responsabilità nei Service.

### Testabilità

Le dipendenze invertite permettono di testare i Service sostituendo repository, generatore del documento e provider temporale con stub, fake o mock. Le regole del dominio possono essere testate indipendentemente dall'infrastruttura.

`SicurezzaInputService` viene testato direttamente con payload sospetti e valori legittimi, inclusa l'analisi ricorsiva di oggetti e array. Un test HTTP separato verifica che il middleware intercetti query string e body prima dei controller, restituisca HTTP 400 e produca il log tecnico previsto.

I test unitari di UC-01 verificano anche l'isolamento fra bozze, il cleanup selettivo, la memorizzazione del periodo calcolato e la delega della ricerca di sovrapposizione alla porta di persistenza. I test di integrazione vengono riservati ai comportamenti che dipendono realmente da PostgreSQL, come mapping, query e confine transazionale. Il dettaglio dei test presenti e il comando operativo di esecuzione appartengono al README, agli script del progetto e alla suite di test.

## 9. Stack e ambiente tecnico

### Backend

- **Node.js 24 LTS** come runtime;
- **TypeScript** come linguaggio dei sorgenti backend, con type checking strict e compilazione tramite `tsc`;
- **Express.js** per il confine HTTP;
- sintassi `import`/`export` nei sorgenti e **CommonJS** come formato dei moduli eseguiti da Node.js;
- **npm** e `package-lock.json` per la gestione riproducibile delle dipendenze;
- **pg** come driver PostgreSQL;
- **tsx** come supporto all'esecuzione e al watch in sviluppo.

La linea LTS viene preferita a una release Current per stabilità del runtime. TypeScript viene applicato al backend per rendere espliciti contratti e dipendenze e anticipare errori rilevabili staticamente; il costo accettato è una fase di compilazione e una configurazione aggiuntiva del toolchain. Il runtime resta JavaScript su Node.js e l'output compilato rimane CommonJS, quindi l'adozione di TypeScript non introduce un cambio del modello di deployment.

Non viene introdotto un ORM perché lo scope permette di mantenere espliciti SQL e mapping senza aggiungere un ulteriore livello di astrazione.

### Frontend

Il client usa HTML5, CSS e JavaScript vanilla, con `fetch()` per le chiamate HTTP/JSON. TypeScript non viene esteso al frontend nella versione 1.0, evitando una pipeline di build lato browser che i due workflow core non giustificano. Non viene introdotto un framework SPA o un template engine aggiuntivo.

Per UC-01 il frontend rappresenta cinque step. I primi quattro acquisiscono e persistono progressivamente la bozza; il quinto è il riepilogo operativo e non aggiunge uno stato persistente del workflow. Gli step già raggiungibili possono essere selezionati direttamente dalla navigazione superiore, mentre non è consentito saltare verso uno step futuro non ancora validato. Nel riepilogo il client richiede al backend l'anteprima HTML tramite una route dedicata e la mostra in un `iframe` sandboxed; conferma, conservazione della bozza e annullamento restano azioni esplicite e separate.

Per UC-02 il frontend è esposto dalla pagina statica `public/pagamenti.html`. La pagina guida la selezione di Immobile e Inquilino, seleziona automaticamente l'unico Inquilino disponibile, richiede al backend la preview della mensilità registrabile e mostra i dati essenziali del Contratto e del Pagamento. L'azione `Pagato` non persiste immediatamente: apre una conferma esplicita e soltanto tale conferma invia la richiesta di registrazione. `Annulla` agisce esclusivamente sullo stato di presentazione e non produce scritture. La preview visualizzata non viene reinviata come dato autorevole: il client trasmette soltanto l'identità della competenza e il backend ricarica e rivalida lo stato persistito.

### Database, test e quality gate

PostgreSQL 16 è il database relazionale della versione 1.0. Jest, integrato con `ts-jest`, è il framework di testing scelto per unit test, assert, spy e mock. I test backend sono scritti in TypeScript e vengono sottoposti a un type-check dedicato.

ESLint svolge l'analisi statica dei sorgenti backend, dei test e del JavaScript frontend. Il comando `npm run verify` orchestra build TypeScript, type-check dei test, lint e test, fornendo un unico quality gate usato sia localmente sia dalla CI.

### Ambiente Docker

Docker Compose fornisce l'ambiente di riferimento con container separati per applicazione e database. È una scelta tecnica per riproducibilità e isolamento dell'ambiente, non un requisito del dominio e non modifica la natura monolitica del backend.

I tag concreti delle immagini e i comandi di installazione, avvio e verifica sono documentati negli artefatti operativi del repository, in particolare `docker/compose.yaml` e `README.md`.

## 10. Design pattern

I quattro pattern trattati nel corso sono stati valutati, ma nessuno viene introdotto esplicitamente nella versione 1.0 perché non risolve un problema attuale meglio della soluzione più semplice.

- **Strategy:** non esiste una famiglia di algoritmi intercambiabili; le tipologie 3+2 e 4+4 differiscono per dati, non per algoritmo.
- **Factory Method:** non esistono famiglie di creazione intercambiabili che richiedano creator o sottoclassi specializzati.
- **Adapter:** implementare una porta non implica automaticamente l'uso del pattern Adapter. Un Adapter esplicito sarebbe giustificato soltanto dalla necessità di tradurre un contratto esterno incompatibile.
- **Observer:** non esiste un meccanismo uno-a-molti di eventi o notifiche che lo richieda.

La scelta evita astrazioni preventive. I punti di variazione reali sono già isolati tramite porte e potranno essere estesi qualora emerga una nuova esigenza concreta.

## 11. Organizzazione fisica dei sorgenti

La struttura fisica riflette i boundary logici dell'architettura:

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

public/
  css/
  js/

db/
  migrations/
  seed/

test/
```

Il mapping principale è:

```text
interface logica → src/web
application      → src/application
domain           → src/domain
infrastructure   → src/infrastructure
```

Le directory vengono introdotte quando contengono componenti con una responsabilità reale; non sono necessari placeholder per rappresentare cartelle ancora vuote.
