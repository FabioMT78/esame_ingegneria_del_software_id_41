# Modellazione UML — Gestionale Affitti
Questo documento raccoglie le decisioni di modellazione assunte e serve a mantenere coerenti requisiti, diagrammi UML e successive decisioni di design.

## Stato della fase
La **Fase 02 — Modellazione UML** è completata.

Artefatti approvati:
- `uml/use-case.puml`
- `uml/domain-model.puml`
- `uml/class-diagram-initial.puml`
- `uml/sequence-uc01.puml`
- `uml/activity-uc01.puml`
- `uml/sequence-uc02.puml`

Non viene prodotto un Activity Diagram per UC-02: il relativo Sequence Diagram descrive già in modo sufficiente il flusso, le alternative e gli errori significativi; un ulteriore diagramma aggiungerebbe soprattutto duplicazione senza chiarire nuove decisioni di processo.

## Use Case Diagram
La versione 1.0 ha un solo attore diretto:
- **Proprietario**

I due casi d'uso core sono:
- **UC-01 — Registrare un contratto di locazione**
- **UC-02 — Registrare il pagamento di un canone**

L'Inquilino non è un attore del sistema nella versione 1.0, ma un ruolo assunto da una Persona nel dominio contrattuale.

Non vengono introdotti `<<include>>`, `<<extend>>` o generalizzazioni, perché i requisiti non individuano comportamenti autonomi riutilizzati o estensioni opzionali che ne giustifichino l'uso.

## Decisioni approvate per il Domain Model
### Persona e ruoli contrattuali
**Decisione:** modellare un unico concetto `Persona`.

`Proprietario` e `Inquilino` sono ruoli assunti da una Persona rispetto a un Contratto, non sottotipi distinti.

Il Domain Model userà quindi due associazioni nominate tra `Persona` e `Contratto`:
- `proprietario`
- `inquilino`

La stessa Persona può partecipare a più contratti nel tempo e può assumere ruoli diversi in rapporti contrattuali differenti.

I requisiti aggiornati stabiliscono che una Persona è riconosciuta tramite codice fiscale e, se deve essere registrata, richiedono almeno:
- nome;
- cognome;
- luogo di nascita;
- data di nascita;
- codice fiscale;
- dati della residenza.

Per una Persona che assume il ruolo di inquilino devono inoltre essere disponibili i dati del documento di riconoscimento.

**Decisione:** la residenza non viene modellata come insieme di attributi direttamente su `Persona`; si riusa il concetto `Indirizzo`, già necessario per `Immobile`, tramite un'associazione nominata `residenza`. In questo modo `Indirizzo` rappresenta un concetto del dominio riutilizzabile, mentre il significato specifico è espresso dal ruolo dell'associazione.

Ogni `Persona` è associata a un `Indirizzo` di residenza. Più Persone possono condividere lo stesso indirizzo di residenza. I requisiti della versione 1.0 richiedono per la residenza almeno provincia, comune, indirizzo e numero civico; gli ulteriori dati di `Indirizzo` necessari per l'ubicazione di un Immobile non diventano automaticamente obbligatori per la residenza.

### Mensilità
**Decisione:** non modellare `Mensilità` come entità autonoma del Domain Model.

Le mensilità rilevanti per UC-02 sono considerate un concetto derivato da:
- periodo del `Contratto`;
- giorno mensile di pagamento;
- mese di competenza;
- `Pagamento` già registrati.

Per ogni mensilità derivata valgono le seguenti regole approvate:
- può essere registrata come pagata dal primo giorno del relativo mese di competenza;
- diventa dovuta dal giorno di pagamento previsto dal Contratto, compreso;
- è futura se appartiene a un mese successivo a quello corrente;
- un pagamento è tardivo quando viene registrato dopo la data di scadenza della mensilità;
- le date `dal` e `al` sono entrambe comprese nel periodo contrattuale;
- una mensilità interamente compresa nel periodo contrattuale ha importo pari a `canoneMensile`;
- la prima mensilità, quando `dal` non coincide con il primo giorno del mese, ha importo proporzionale ai giorni compresi tra `dal` e la fine del mese, estremi inclusi;
- l'ultima mensilità, quando `al` non coincide con l'ultimo giorno del mese, ha importo proporzionale ai giorni compresi tra l'inizio del mese e `al`, estremi inclusi;
- per una mensilità di confine parziale l'importo è calcolato come `canoneMensile * giorniCoperti / giorniDelMese`, senza arrotondamenti intermedi e con arrotondamento del solo risultato finale a due cifre decimali.

La prima mensilità non richiede una regola di esclusione speciale durante UC-02: alla registrazione definitiva del Contratto viene creato e memorizzato il relativo `Pagamento`, con data coincidente con la data di decorrenza del Contratto e importo calcolato secondo le regole della competenza iniziale.

Nella progettazione corrente non viene introdotta una classe software autonoma `Mensilita`: le regole temporali ed economiche della competenza restano responsabilità del `Contratto`, mentre il caso d'uso di pagamento individua la competenza non pagata confrontando periodo contrattuale e `Pagamento` già registrati. L'estrazione futura di un oggetto dedicato resta un possibile refactoring qualora tali regole crescano in complessità.

### Bozza di contratto
**Decisione:** `BozzaContratto` non appartiene al Domain Model.

La bozza rappresenta lo stato temporaneo e recuperabile della procedura guidata di UC-01. Verrà quindi resa esplicita nei diagrammi dinamici, in particolare:
- `uml/sequence-uc01.puml`;
- `uml/activity-uc01.puml`.

**Decisione:** gli eventuali nuovi `Immobile`, `Persona` e dati di `DocumentoRiconoscimento` acquisiti durante UC-01 non vengono salvati permanentemente al completamento dei singoli step. Fino alla conferma definitiva rimangono dati della bozza. La persistenza definitiva avviene insieme alla registrazione del `Contratto`; in caso di annullamento, tali nuovi dati non devono rimanere registrati.

**Raffinamento di design:** una `Persona` già registrata viene caricata nella bozza come working copy e i suoi dati vengono mostrati per verifica ed eventuale modifica; nell'ambito di UC-01 `id` e codice fiscale restano invariati. Le modifiche a dati anagrafici, residenza e, per l'inquilino, documento di riconoscimento diventano permanenti soltanto alla conferma definitiva. Un `Immobile` già registrato viene invece soltanto selezionato e non modificato in UC-01. Non vengono introdotti flag `...Nuovo` nella bozza.

**Decisione di design sul recupero di una bozza residua:** alla successiva apertura di UC-01, se esiste una bozza, il sistema confronta progressivamente con i contratti già registrati l'identificazione catastale dell'Immobile, il codice fiscale dell'Inquilino e il periodo `dal`--`al`, quando tali dati sono presenti nella bozza. Solo se tutti e tre gli elementi sono disponibili e coincidono con un contratto registrato, la bozza è considerata residua di una registrazione già completata e viene eliminata automaticamente senza interazione con l'utente. Se i dati non sono tutti disponibili o uno dei confronti non coincide, la bozza viene normalmente proposta per la ripresa.

### Immobile, Indirizzo e DatiCatastali
**Decisione:** modellare `Immobile`, `Indirizzo` e `DatiCatastali` come concetti distinti. `Indirizzo` è un concetto condiviso: viene usato sia per rappresentare l'ubicazione di un `Immobile` sia, tramite l'associazione nominata `residenza`, l'indirizzo di residenza di una `Persona`.

`Immobile` possiede un nome leggibile assegnato dal proprietario, che non è univoco e non ne determina l'identità.

Ogni Immobile è associato a un solo `Indirizzo` e a un solo insieme di `DatiCatastali`.

#### Indirizzo
Attributi concettuali scelti:
- nazione;
- provincia;
- comune;
- CAP;
- indirizzo;
- civico, se presente;
- scala, se presente;
- interno, se presente.

Per l'ubicazione di un `Immobile`, i requisiti prevedono nazione, provincia, comune, CAP, indirizzo ed eventualmente civico, scala e interno.

Per la `residenza` di una `Persona`, la versione 1.0 richiede almeno provincia, comune, indirizzo e numero civico. Gli altri attributi del concetto `Indirizzo` non sono resi obbligatori per la residenza soltanto perché appartengono allo stesso concetto.

Quando l'interno è specificato per l'ubicazione di un Immobile, l'indirizzo completo non può coincidere con quello di un altro Immobile registrato.

#### DatiCatastali
Attributi concettuali scelti:
- codice comunale;
- foglio;
- particella;
- subalterno;
- categoria;
- consistenza;
- rendita.

La combinazione:
`codice comunale + foglio + particella + subalterno`

costituisce l'identificazione catastale dell'Immobile.

`categoria`, `consistenza` e `rendita` sono caratteristiche catastali, ma non partecipano all'identificazione.

Non possono esistere due Immobili con la stessa combinazione identificativa catastale.

### Documento di riconoscimento
**Decisione:** modellare `DocumentoRiconoscimento` come concetto autonomo del Domain Model.

Il documento non è un semplice raggruppamento tecnico di campi: è un concetto riconoscibile del dominio e la sua presenza è soggetta a una regola specifica quando una `Persona` assume il ruolo di inquilino.

Attributi concettuali scelti:
- tipo di documento, limitato nella versione 1.0 a carta d'identità o passaporto;
- organo emittente;
- data di rilascio;
- data di scadenza;
- numero del documento.

La cardinalità generale è:
- una `Persona` può avere `0..1` `DocumentoRiconoscimento`;
- ogni `DocumentoRiconoscimento` appartiene a una sola `Persona`.

Vincolo aggiuntivo: quando una `Persona` assume il ruolo di `inquilino` in un `Contratto`, il `DocumentoRiconoscimento` deve essere presente. La versione 1.0 non gestisce storico o pluralità di documenti per la stessa Persona.

### Tipologia contrattuale, Articolo e copia storica del contratto
**Decisione:** la `TipologiaContrattuale` descrive sia il periodo iniziale sia il rinnovo previsto dalla tipologia, ma la versione 1.0 gestisce operativamente soltanto il periodo iniziale.

Attributi concettuali scelti per `TipologiaContrattuale`:
- `denominazione`;
- `durata`, espressa in anni e riferita al periodo iniziale;
- `rinnovo`, espresso in anni.

Per le tipologie supportate:
- canone concordato 3+2: `durata = 3`, `rinnovo = 2`;
- canone libero 4+4: `durata = 4`, `rinnovo = 4`.

La data finale derivata `/al` del `Contratto` è calcolata usando esclusivamente `durata`. Il valore `rinnovo` descrive la tipologia ma non estende il periodo gestito dalla versione 1.0 e non introduce operazioni di rinnovo.

**Decisione:** utilizzare un unico concetto `Articolo`. La differenza tra articolo predefinito e articolo registrato è espressa dal ruolo dell'associazione e dall'istanza concreta, non da classi distinte.

Attributi concettuali scelti per `Articolo`:
- `numArticolo`;
- `titolo`;
- `sottotitolo`;
- `testo`.

Le istanze di `Articolo` associate alla `TipologiaContrattuale` rappresentano i modelli predefiniti e possono contenere dati da valorizzare durante UC-01. Alla registrazione definitiva, dopo la costruzione del `Contratto` con i dati finali validati, il sistema ne crea copie distinte, le valorizza e le associa al `Contratto`. Le copie valorizzate non vengono conservate nella bozza, così eventuali modifiche effettuate dal riepilogo non possono renderle obsolete.

**Cardinalità e vincolo di appartenenza:**
- ogni `TipologiaContrattuale` possiede `1..*` `Articolo` nel ruolo di articoli predefiniti;
- ogni `Contratto` registrato possiede `1..*` `Articolo` nel ruolo di articoli registrati;
- ogni singola istanza di `Articolo` appartiene esattamente a uno tra `TipologiaContrattuale` e `Contratto`;
- gli articoli registrati sono copie valorizzate distinte dagli articoli predefiniti e non vengono modificati se cambiano successivamente i modelli o i dati sorgente.

**Decisione:** modellare `ContrattoRegistrato` come copia storica completa e immutabile del contratto al momento della registrazione definitiva.

`ContrattoRegistrato` contiene il contenuto completo del documento contrattuale generato, comprensivo dei dati inseriti durante UC-01 e degli articoli valorizzati. Ogni `Contratto` registrato possiede esattamente un `ContrattoRegistrato`, che deve rimanere indipendente da successive modifiche dei dati sorgente o degli articoli predefiniti.

Il formato concreto del contenuto (`string`, Markdown, PDF, JSON/JSONB o altra rappresentazione) non viene deciso nel Domain Model. Nel Class Diagram iniziale viene usato il tipo astratto `string` per rappresentare il contenuto testuale; la scelta di persistenza e del formato definitivo è rinviata alla fase di design/infrastruttura.

Non viene introdotto uno `storicoContratti` con più versioni dello stesso `Contratto`: la versione 1.0 non prevede modifiche successive alla registrazione definitiva. Lo storico dei diversi contratti relativi a un immobile è già rappresentato dall'associazione `Immobile`--`Contratto`.

La creazione delle copie degli articoli e del `ContrattoRegistrato` verrà rappresentata nel Sequence Diagram di UC-01.

### Pagamento e storia dei pagamenti del Contratto
**Decisione:** `Pagamento` resta un concetto separato dal `Contratto`, ma ne rappresenta un elemento della storia ed esiste sempre in relazione a un solo Contratto.

UC-02 -- Registrare il pagamento di un canone è l'azione applicativa; `Pagamento` è invece il fatto storico registrato.

Attributi concettuali scelti per `Pagamento`:
- `annoCompetenza`;
- `meseCompetenza`, espresso come numero da 1 a 12;
- `dataPagamento`;
- `importo`.

L'importo viene determinato automaticamente a partire dal `canoneMensile` e dal periodo del Contratto e viene memorizzato nel `Pagamento` per preservare il dato storico. Per le mensilità intermedie coincide con il canone mensile; per la prima e l'ultima mensilità parziali viene applicato il pro-rata sui giorni effettivamente compresi nel periodo contrattuale, con arrotondamento del solo risultato finale a due cifre decimali. I pagamenti parziali restano fuori scope: il pro-rata costituisce l'importo completo dovuto per la mensilità di confine coperta solo in parte.

La cardinalità approvata è:
- un `Contratto` possiede da **1 a molti** `Pagamento`;
- ogni `Pagamento` appartiene a **un solo** `Contratto`;
- per la stessa coppia `annoCompetenza + meseCompetenza` dello stesso Contratto può esistere al massimo un `Pagamento`.

Alla registrazione definitiva del `Contratto`, UC-01 crea e memorizza il `Pagamento` della prima mensilità con:
- `annoCompetenza` e `meseCompetenza` ricavati dalla data `dal`;
- `dataPagamento = Contratto.dal`;
- `importo` calcolato dal Contratto per la competenza iniziale: canone pieno se `dal` è il primo giorno del mese, altrimenti pro-rata sui giorni da `dal` alla fine del mese, estremi inclusi.

I Pagamenti successivi vengono aggiunti tramite UC-02.

## Concetti del Domain Model
I concetti del Domain Model sono:
- `Persona`;
- `Immobile`;
- `Indirizzo`;
- `DatiCatastali`;
- `Contratto`;
- `TipologiaContrattuale`;
- `Articolo`;
- `ContrattoRegistrato`;
- `Pagamento`;
- `DocumentoRiconoscimento`.

Per `Contratto` gli attributi essenziali sono:
- nome o breve descrizione;
- data iniziale `dal`;
- data finale derivata `/al`;
- canone mensile;
- giorno di pagamento.

La data finale `/al` resta visibile perché è semanticamente rilevante per il periodo contrattuale e per il vincolo di non sovrapposizione, ma è marcata come derivata poiché viene determinata da `dal` e da `TipologiaContrattuale.durata`.

Il contenuto storico strutturato del contratto è rappresentato dale istanze di `Articolo` associate al `Contratto`, mentre `ContrattoRegistrato` conserva la copia completa del documento generato al momento della registrazione. Non vengono creati snapshot separati di `Persona`, `Immobile` o altri concetti: i valori rilevanti sono incorporati nella copia completa e negli articoli valorizzati.

## Vincoli di dominio
- il codice fiscale identifica una Persona registrata;
- ogni Persona è associata a un Indirizzo di residenza; più Persone possono condividere lo stesso Indirizzo;
- una Persona può avere al massimo un DocumentoRiconoscimento nella versione 1.0;
- per una Persona che assume il ruolo di inquilino devono essere disponibili i dati del documento di riconoscimento previsti dai requisiti;
- il giorno di pagamento è compreso tra 1 e 28;
- `TipologiaContrattuale.durata` e `TipologiaContrattuale.rinnovo` sono espressi in anni;
- la data finale del periodo iniziale è determinata dalla data iniziale e da `TipologiaContrattuale.durata`; il rinnovo non viene applicato al periodo gestito nella versione 1.0;
- ogni TipologiaContrattuale possiede almeno un Articolo nel ruolo di articolo predefinito;
- ogni Contratto registrato possiede almeno un Articolo nel ruolo di articolo registrato;
- ogni istanza di Articolo appartiene esattamente a uno tra TipologiaContrattuale e Contratto;
- le istanze di Articolo associate al Contratto sono copie valorizzate distinte dagli articoli predefiniti e non devono dipendere da successive modifiche dei modelli o dei dati sorgente;
- ogni Contratto possiede esattamente un ContrattoRegistrato come copia storica completa;
- il ContrattoRegistrato non deve dipendere da successive modifiche dei dati sorgente o degli articoli predefiniti;
- i periodi di due contratti relativi allo stesso Immobile non possono sovrapporsi;
- alla registrazione definitiva del Contratto viene registrato il pagamento della prima mensilità con anno e mese di competenza ricavati da `dal`, `dataPagamento = dal` e importo calcolato secondo la regola della competenza iniziale;
- ogni Contratto registrato possiede almeno un Pagamento;
- `meseCompetenza` è compreso tra 1 e 12;
- per la stessa coppia `annoCompetenza + meseCompetenza` dello stesso Contratto può esistere al massimo un Pagamento;
- l'importo del Pagamento viene determinato dal Contratto a partire dal canone mensile e dai giorni effettivamente coperti nella competenza e memorizzato come dato storico; per le mensilità di confine parziali il calcolo usa `canoneMensile * giorniCoperti / giorniDelMese` e arrotonda soltanto il risultato finale a due cifre decimali;
- una mensilità è pagabile dal primo giorno del relativo mese di competenza;
- una mensilità diventa dovuta dal giorno di pagamento previsto dal Contratto, compreso;
- un Pagamento registrato dopo la scadenza della relativa mensilità è tardivo;
- i pagamenti parziali sono fuori scope;
- una mensilità già pagata non può essere proposta nuovamente;
- le mensilità appartenenti a mesi successivi a quello corrente non possono essere proposte per la registrazione del pagamento.

## Esito della review del Domain Model
La review iniziale del Domain Model aveva consolidato la baseline concettuale. Durante la costruzione del Class Diagram iniziale sono emerse ulteriori informazioni di dominio, che hanno richiesto un aggiornamento controllato della baseline:
- `TipologiaContrattuale.durataPeriodoIniziale` è stata sostituita da `durata` e `rinnovo`, entrambi espressi in anni;
- `Clausola` è stata sostituita da un unico concetto `Articolo`; il ruolo di articolo predefinito o registrato è espresso dalle associazioni e da istanze distinte;
- è stato introdotto `ContrattoRegistrato` per conservare una copia storica completa del documento contrattuale generato;
- `Pagamento` è stato raffinato con `annoCompetenza`, `meseCompetenza`, `dataPagamento` e `importo`;
- l'unicità di un pagamento è riferita alla coppia anno--mese di competenza all'interno dello stesso Contratto;
- `Contratto.al` resta rappresentato come attributo derivato `/al` e dipende dalla sola `durata` iniziale;
- `DocumentoRiconoscimento` mantiene il vincolo della versione 1.0 sui tipi ammessi: carta d'identità o passaporto.

Le modifiche sono state propagate a requisiti, Domain Model e Class Diagram iniziale. Il Domain Model aggiornato è assunto come nuova baseline concettuale.

### Aggiornamento controllato emerso nella fase di design
Durante la progettazione architetturale è stata precisata la regola economica delle mensilità di confine. Le date `dal` e `al` sono inclusive; la prima e l'ultima mensilità possono quindi coprire soltanto una parte del relativo mese di calendario. In tali casi l'importo è calcolato in pro-rata sui giorni effettivamente compresi nel contratto, senza arrotondamenti intermedi e con arrotondamento del risultato finale a due cifre decimali. Questa precisazione non introduce una nuova entità di dominio e non modifica la struttura del Domain Model: aggiorna le regole associate a `Contratto` e `Pagamento` e i diagrammi dinamici dei due casi d'uso.

## Stato del Domain Model
Il Domain Model aggiornato è approvato come baseline della fase 02.

Sono consolidate le seguenti decisioni:
- `Persona` con i ruoli associativi `proprietario` e `inquilino`;
- `Indirizzo` condiviso tra ubicazione dell'`Immobile` e residenza della `Persona`;
- `DocumentoRiconoscimento` come concetto autonomo, opzionale in generale ma obbligatorio per il ruolo di inquilino;
- `DatiCatastali` come concetto autonomo e identificazione catastale basata su codice comunale, foglio, particella e subalterno;
- `Mensilità` come concetto derivato, non come entità autonoma;
- `BozzaContratto` esclusa dal Domain Model e rinviata ai diagrammi dinamici;
- `TipologiaContrattuale` con `durata` e `rinnovo`;
- un unico `Articolo`, associato alla TipologiaContrattuale come modello predefinito oppure al Contratto come copia valorizzata;
- `ContrattoRegistrato` associato 1:1 al Contratto come copia storica completa del documento generato;
- `Contratto` ↔ `Pagamento` con cardinalità `1` ↔ `1..*`;
- `Pagamento` con competenza anno/mese e importo memorizzato.

## Decisioni di tipizzazione per il Class Diagram iniziale
Il Class Diagram iniziale aggiunge tipi software essenziali senza introdurre architettura, persistenza o framework.

Decisioni approvate:
- `DatiCatastali.foglio`, `particella` e `subalterno` sono `int`, perché nel dominio assunto contengono esclusivamente valori numerici;
- `codiceComunale` resta `string`;
- `Pagamento.annoCompetenza` e `meseCompetenza` sono `int`;
- `Pagamento.importo`, `Contratto.canoneMensile`, `DatiCatastali.consistenza` e `rendita` sono `decimal`;
- le date sono rappresentate con il tipo astratto `date`;
- gli identificatori/codici testuali, il contenuto degli articoli e `ContrattoRegistrato.contenuto` sono `string`.

La scelta di memorizzare gli articoli in PostgreSQL tramite JSON/JSONB, tabelle relazionali o altra rappresentazione è rinviata alla progettazione della persistenza.

## Sequence Diagram UC-01
Il Sequence Diagram di UC-01 usa ruoli logici e non introduce ancora l'architettura definitiva.

Partecipanti:
- `Proprietario`: attore esterno;
- `Interfaccia UC-01`: punto di interazione con il proprietario;
- `Gestione UC-01`: ruolo logico che orchestra il caso d'uso;
- `Bozza UC-01`: stato temporaneo recuperabile della procedura, non entità del Domain Model;
- `Archivio dati`: ruolo astratto per letture e scritture persistenti, senza fissare repository, database o tecnologia;
- `Contratto`, `ContrattoRegistrato` e `Pagamento`: concetti già consolidati nella modellazione.

Decisioni dinamiche rappresentate:
- all'avvio, una bozza esistente viene prima confrontata progressivamente con i contratti registrati tramite dati catastali dell'Immobile, codice fiscale dell'Inquilino e periodo `dal`--`al`;
- una bozza che coincide su tutti e tre gli elementi con un contratto già registrato viene considerata residua, eliminata silenziosamente e non proposta per la ripresa; negli altri casi viene recuperata;
- ogni step valido aggiorna la bozza;
- nuovi immobili e persone, insieme alle modifiche validate a persone già registrate e ai dati di riconoscimento, restano nella bozza fino alla conferma finale;
- il controllo di sovrapposizione avviene prima della registrazione definitiva;
- alla conferma valida viene costruito il `Contratto`; soltanto a quel punto gli articoli predefiniti vengono copiati e valorizzati sui dati finali, poi vengono costruiti `ContrattoRegistrato` e il primo `Pagamento`;
- il salvataggio dei dati definitivi è rappresentato come un'unica operazione logica coerente e atomica;
- dopo il completamento con successo della registrazione definitiva viene tentata l'eliminazione della bozza, ma tale cleanup non appartiene alla transazione dei dati definitivi;
- un errore nella cancellazione della bozza non invalida il contratto già registrato; la bozza residua viene riconosciuta ed eliminata automaticamente alla successiva apertura se coincide con un contratto registrato secondo il confronto definito;
- in caso di sovrapposizione o errore del salvataggio definitivo la bozza resta disponibile;
- l'annullamento prima della conferma elimina la bozza e non persiste né i nuovi dati acquisiti né le modifiche apportate a dati esistenti.

## Activity Diagram UC-01
L'Activity Diagram di UC-01 completa il Sequence Diagram rappresentando il flusso end-to-end della procedura guidata.

Decisioni dinamiche rappresentate:
- verifica dell'eventuale bozza all'avvio, eliminazione silenziosa se risulta residua di un contratto già registrato, altrimenti recupero e ripresa della procedura;
- avanzamento attraverso i sei step previsti;
- validazione e correzione dei dati prima dell'avanzamento;
- distinzione tra selezione di un Immobile esistente e acquisizione di un nuovo Immobile;
- acquisizione di Persona e DocumentoRiconoscimento quando necessari;
- aggiornamento della bozza dopo gli step validi;
- possibilità di annullamento prima della conferma definitiva;
- nessuna persistenza definitiva dei nuovi dati o delle modifiche a dati esistenti in caso di annullamento;
- ritorno alla modifica in caso di sovrapposizione del periodo contrattuale;
- registrazione definitiva coerente e atomica di Contratto, articoli valorizzati alla conferma, ContrattoRegistrato, primo Pagamento, eventuali nuovi dati e modifiche validate a Persone già registrate;
- cleanup della bozza successivo alla registrazione definitiva: un eventuale errore di cancellazione non annulla il risultato già persistito.

L'Activity Diagram non introduce componenti architetturali: usa i ruoli `Proprietario` e `Sistema` per descrivere il processo.

## Sequence Diagram UC-02
Il Sequence Diagram di UC-02 usa ruoli logici e non introduce ancora l'architettura definitiva.

Partecipanti:
- `Proprietario`: attore esterno;
- `Interfaccia UC-02`: punto di interazione con il proprietario;
- `Gestione UC-02`: ruolo logico che orchestra il caso d'uso;
- `Archivio dati`: ruolo astratto per il recupero e il salvataggio dei dati persistenti;
- `Pagamento`: concetto di dominio creato al completamento positivo del caso d'uso.

Decisioni dinamiche rappresentate:
- selezione dell'Immobile e individuazione dell'Inquilino associato;
- recupero di Contratti e Pagamenti esistenti;
- individuazione, nella logica del caso d'uso, della mensilità non pagata cronologicamente più vecchia fino al mese corrente;
- esclusione delle mensilità già pagate e di quelle appartenenti a mesi futuri;
- possibilità di pagare la mensilità corrente dal primo giorno del mese, anche prima del giorno di pagamento;
- il pagamento tardivo resta consentito;
- se non esiste alcuna mensilità disponibile, nessun Pagamento viene creato;
- l'importo del nuovo Pagamento è determinato automaticamente dal `Contratto`: coincide con il canone mensile per le competenze interamente coperte e applica il pro-rata per l'ultima mensilità parziale;
- l'annullamento non produce alcuna registrazione;
- la registrazione avviene soltanto dopo conferma esplicita;
- un errore di salvataggio non deve produrre un falso esito positivo o dati incoerenti.

`Mensilità` non compare come partecipante autonomo perché nella baseline approvata è un concetto derivato, non un'entità del Domain Model.

## Class Diagram di design

La Fase 03 introduce `uml/class-diagram-design.puml`, distinto dal Class Diagram iniziale della Fase 02.
Il diagramma rappresenta Service applicativi, application model, porte, oggetti di dominio e comportamenti
pubblici essenziali. Le classi di dominio persistibili ricevono nel design un `id : identifier` tecnico,
opzionale prima della prima persistenza; ciò non modifica il Domain Model concettuale né le chiavi naturali.
`BozzaContratto` non riceve un identificatore dedicato.

Gli application model introdotti sono `BozzaContratto` e `PagamentoDaRegistrare`.
Non viene mantenuto un application model `RegistrazioneContratto`: nel design rivisto la porta di registrazione
definitiva riceve direttamente il `Contratto` completo, che costituisce la rappresentazione autorevole dello
stato definitivo di UC-01. Le implementazioni concrete delle porte non sono ancora rappresentate perché
persistenza e stack restano aperti.

## Tracciabilità UML corrente
| User Story | Requisiti | Acceptance Criteria | Caso d'uso | Artefatti UML correnti |
|---|---|---|---|---|
| US-01 | RF-01–RF-06 | AC-01–AC-09 | UC-01 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram-initial.puml`, `uml/sequence-uc01.puml`, `uml/activity-uc01.puml`, `uml/class-diagram-design.puml` |
| US-02 | RF-07–RF-10 | AC-10–AC-15 | UC-02 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram-initial.puml`, `uml/sequence-uc02.puml`, `uml/class-diagram-design.puml` |


## Esito finale della fase 02
La modellazione UML della versione 1.0 è approvata come baseline per la fase successiva.

La catena attualmente coperta è:
- requisiti e acceptance criteria;
- casi d'uso;
- modello concettuale del dominio;
- Class Diagram iniziale;
- comportamento dinamico di UC-01;
- comportamento dinamico di UC-02.

La **Fase 03 — Architettura, class design e SOLID** è in corso. Le decisioni architetturali, il confine transazionale di UC-01 e la prima baseline completa del Class Diagram di design sono documentati in `docs/architettura.md` e `uml/class-diagram-design.puml`. Restano ancora da completare la review esplicita di SOLID/qualità, la decisione motivata sui pattern, la persistenza concreta e lo stack tecnologico.

Le sorgenti PlantUML approvate dovranno essere esportate in PDF e inserite nella relazione LaTeX quando verrà predisposta la documentazione finale.
