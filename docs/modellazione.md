# Modellazione UML — Gestionale Affitti
Questo documento raccoglie le decisioni di modellazione assunte e serve a mantenere coerenti requisiti, diagrammi UML e successive decisioni di design.

## Stato della fase
La **Fase 02 — Modellazione UML** è completata e la baseline è stata successivamente raffinata durante la Fase 03 mantenendo gli stessi artefatti versionati.

Artefatti approvati:
- `uml/use-case.puml`
- `uml/domain-model.puml`
- `uml/class-diagram.puml`
- `uml/sequence-uc01.puml`
- `uml/activity-uc01.puml`
- `uml/sequence-uc02.puml`

Non viene prodotto un Activity Diagram per UC-02: il relativo Sequence Diagram descrive già in modo sufficiente il flusso, le alternative e gli errori significativi; un ulteriore diagramma aggiungerebbe soprattutto duplicazione senza chiarire nuove decisioni di processo.

Il Class Diagram viene mantenuto come unico artefatto versionato in `uml/class-diagram.puml`: la sua evoluzione dalla prima baseline concettuale al design software è ricostruibile tramite la storia Git.

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

### Tipologia contrattuale, Articolo e contenuto storico del Contratto
**Decisione:** la `TipologiaContrattuale` descrive sia il periodo iniziale sia il rinnovo previsto dalla tipologia, ma la versione 1.0 gestisce operativamente soltanto il periodo iniziale.

Attributi concettuali scelti per `TipologiaContrattuale`:
- `denominazione`;
- `durata`, espressa in anni e riferita al periodo iniziale;
- `rinnovo`, espresso in anni.

Per le tipologie supportate:
- canone concordato 3+2: `durata = 3`, `rinnovo = 2`;
- canone libero 4+4: `durata = 4`, `rinnovo = 4`.

La data finale derivata `/al` del `Contratto` è calcolata usando esclusivamente `durata`. Il valore `rinnovo` descrive la tipologia ma non estende il periodo gestito dalla versione 1.0 e non introduce operazioni di rinnovo.

**Decisione:** `Articolo` rappresenta esclusivamente il template contrattuale associato alla `TipologiaContrattuale`; non vengono create o persistite copie di `Articolo` associate al `Contratto`.

Attributi concettuali scelti per `Articolo`:
- `numArticolo`;
- `numParte`;
- `titolo`;
- `sottotitolo`, opzionale;
- `descrizione`.

Uno stesso articolo logico può essere suddiviso in più parti ordinate. `numArticolo` identifica l'articolo, mentre `numParte` stabilisce l'ordine dei frammenti. Questa struttura permette di comporre il testo finale inserendo tra due parti i valori dinamici acquisiti durante UC-01, senza codificare il numero della parte in una cifra decimale. La coppia `numArticolo + numParte` è univoca all'interno della tipologia contrattuale.

Ogni `TipologiaContrattuale` possiede `1..*` `Articolo` predefiniti. Le parti vengono lette come template e utilizzate soltanto per generare il documento finale; non diventano elementi della storia persistente del `Contratto`.

**Decisione:** la copia storica completa viene conservata direttamente nel `Contratto` tramite l'attributo `contenuto`. Alla conferma definitiva il sistema genera il documento completo usando i dati finali validati e gli articoli template e assegna tale contenuto al `Contratto` prima della persistenza.

Il `Contratto` conserva anche `registratoIl`, data della registrazione applicativa. Poiché un `Contratto` viene creato e persistito soltanto alla conferma finale, `registratoIl` è valorizzato per ogni Contratto registrato e non viene usato come flag bozza/registrato.

Lo stato del Contratto rispetto al tempo non viene memorizzato con flag `inEssere` o `scaduto`: è un valore derivato dal periodo e dalla data corrente, con i possibili significati futuro, in essere e scaduto.

Nel Domain Model il formato concreto di `contenuto` resta astratto. La Fase 03 concretizza la versione 1.0 come HTML persistito in una colonna testuale. Una futura rappresentazione PDF potrà essere aggiunta come artefatto separato senza cambiare il significato di `contenuto`.

La copia memorizzata nel `Contratto` deve rimanere indipendente da successive modifiche dei template o dei dati sorgente utilizzati per generarla.

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
- `Pagamento`;
- `DocumentoRiconoscimento`.

Per `Contratto` gli attributi essenziali sono:
- nome o breve descrizione;
- data iniziale `dal`;
- data finale derivata `/al`;
- canone mensile;
- giorno di pagamento;
- data di registrazione `registratoIl`;
- `contenuto`, copia completa del documento generato;
- stato temporale derivato `/stato`.

La data finale `/al` resta visibile perché è semanticamente rilevante per il periodo contrattuale e per il vincolo di non sovrapposizione, ma è marcata come derivata poiché viene determinata da `dal` e da `TipologiaContrattuale.durata`.

Gli `Articolo` rappresentano esclusivamente i template della tipologia contrattuale. La storia del contratto non viene ricostruita dai template: il documento completo generato alla conferma viene conservato direttamente in `Contratto.contenuto` e non deve essere rigenerato in seguito.

## Vincoli di dominio
- il codice fiscale identifica una Persona registrata;
- ogni Persona è associata a un Indirizzo di residenza; più Persone possono condividere lo stesso Indirizzo;
- una Persona può avere al massimo un DocumentoRiconoscimento nella versione 1.0;
- per una Persona che assume il ruolo di inquilino devono essere disponibili i dati del documento di riconoscimento previsti dai requisiti;
- il giorno di pagamento è compreso tra 1 e 28;
- `TipologiaContrattuale.durata` e `TipologiaContrattuale.rinnovo` sono espressi in anni;
- la data finale del periodo iniziale è determinata dalla data iniziale e da `TipologiaContrattuale.durata`; il rinnovo non viene applicato al periodo gestito nella versione 1.0;
- ogni TipologiaContrattuale possiede almeno un Articolo template;
- `numArticolo + numParte` identifica univocamente una parte di articolo all'interno della stessa TipologiaContrattuale;
- più parti con lo stesso `numArticolo` sono ordinate tramite `numParte` e compongono lo stesso articolo logico;
- gli Articolo template non vengono copiati o associati al Contratto registrato;
- ogni Contratto registrato conserva la data `registratoIl` e una copia completa del documento generato in `contenuto`;
- il contenuto storico del Contratto non deve dipendere da successive modifiche dei template o dei dati sorgente;
- lo stato futuro / in essere / scaduto del Contratto è derivato dal periodo rispetto alla data corrente e non è memorizzato come flag persistente;
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
La review iniziale del Domain Model aveva consolidato la baseline concettuale. Le successive attività di design hanno prodotto raffinamenti controllati, propagati ai requisiti e agli UML:
- `TipologiaContrattuale` usa `durata` e `rinnovo`, entrambi espressi in anni;
- `Clausola` è stata sostituita da `Articolo`;
- `Articolo` è stato successivamente semplificato a solo template della tipologia contrattuale, eliminando le copie valorizzate associate al Contratto;
- uno stesso articolo logico può essere suddiviso in parti ordinate tramite `numArticolo` e `numParte`;
- la precedente classe `ContrattoRegistrato` è stata eliminata perché il suo unico contenuto storico è ora responsabilità del `Contratto` stesso;
- `Contratto` conserva `registratoIl` e `contenuto`, mentre lo stato temporale è derivato e non persistito;
- `Pagamento` è stato raffinato con `annoCompetenza`, `meseCompetenza`, `dataPagamento` e `importo`;
- l'unicità di un pagamento è riferita alla coppia anno--mese di competenza all'interno dello stesso Contratto;
- `Contratto.al` resta rappresentato come attributo derivato `/al` e dipende dalla sola `durata` iniziale;
- `DocumentoRiconoscimento` mantiene il vincolo della versione 1.0 sui tipi ammessi: carta d'identità o passaporto.

### Aggiornamento controllato emerso nella fase di design
Durante la progettazione architetturale è stata precisata la regola economica delle mensilità di confine. Le date `dal` e `al` sono inclusive; la prima e l'ultima mensilità possono quindi coprire soltanto una parte del relativo mese di calendario. In tali casi l'importo è calcolato in pro-rata sui giorni effettivamente compresi nel contratto, senza arrotondamenti intermedi e con arrotondamento del risultato finale a due cifre decimali.

La progettazione della persistenza ha inoltre chiarito che `Articolo` è un template e non un elemento storico del Contratto. Il documento finale viene generato soltanto alla conferma definitiva e conservato direttamente in `Contratto.contenuto`; questa scelta elimina la duplicazione costituita da copie valorizzate degli articoli e dalla precedente classe contenitore `ContrattoRegistrato`.

## Stato del Domain Model
Il Domain Model aggiornato è approvato come baseline concettuale.

Sono consolidate le seguenti decisioni:
- `Persona` con i ruoli associativi `proprietario` e `inquilino`;
- `Indirizzo` condiviso tra ubicazione dell'`Immobile` e residenza della `Persona`;
- `DocumentoRiconoscimento` come concetto autonomo, opzionale in generale ma obbligatorio per il ruolo di inquilino;
- `DatiCatastali` come concetto autonomo e identificazione catastale basata su codice comunale, foglio, particella e subalterno;
- `Mensilità` come concetto derivato, non come entità autonoma;
- `BozzaContratto` esclusa dal Domain Model e mantenuta come application model;
- `TipologiaContrattuale` con `durata` e `rinnovo`;
- `Articolo` usato esclusivamente come template, eventualmente suddiviso in parti ordinate;
- `Contratto` con data di registrazione e contenuto storico completo;
- stato del Contratto derivato dal periodo, senza flag persistenti;
- `Contratto` ↔ `Pagamento` con cardinalità `1` ↔ `1..*` nel modello del Contratto registrato;
- `Pagamento` con competenza anno/mese e importo memorizzato.

## Decisioni di tipizzazione per il Class Diagram
Il Class Diagram aggiunge tipi software essenziali e viene mantenuto come unico artefatto versionato.

Decisioni approvate:
- gli identificatori tecnici persistenti sono `int`, assegnati da PostgreSQL tramite colonne identity;
- `DatiCatastali.foglio`, `particella` e `subalterno` sono `int`, perché nel dominio assunto contengono esclusivamente valori numerici;
- `codiceComunale` resta `string`;
- `Articolo.numArticolo` e `Articolo.numParte` sono `int`;
- `Pagamento.annoCompetenza` e `meseCompetenza` sono `int`;
- `Pagamento.importo`, `Contratto.canoneMensile`, `DatiCatastali.consistenza` e `rendita` sono `decimal`;
- le date sono rappresentate con il tipo astratto `date` nel design e mappate sul tipo appropriato nello stack;
- i codici testuali e le descrizioni sono `string`;
- `Contratto.contenuto` è `string`; nella versione 1.0 contiene HTML completo persistito come `TEXT` in PostgreSQL.

## Sequence Diagram UC-01
Il Sequence Diagram di UC-01 usa ruoli logici e non vincola il flusso alle classi concrete dell'architettura.

Partecipanti principali:
- `Proprietario`: attore esterno;
- `Interfaccia UC-01`: punto di interazione con il proprietario;
- `Gestione UC-01`: ruolo logico che orchestra il caso d'uso;
- `Bozza UC-01`: stato temporaneo recuperabile della procedura, non entità del Domain Model;
- `Archivio dati`: ruolo astratto per letture e scritture persistenti;
- `Contratto` e `Pagamento`: concetti di dominio coinvolti alla conferma.

Decisioni dinamiche rappresentate:
- all'avvio, una bozza esistente viene prima confrontata progressivamente con i contratti registrati tramite dati catastali dell'Immobile, codice fiscale dell'Inquilino e periodo `dal`--`al`;
- una bozza che coincide su tutti e tre gli elementi con un contratto già registrato viene considerata residua, eliminata silenziosamente e non proposta per la ripresa; negli altri casi viene recuperata;
- ogni step valido aggiorna la bozza;
- nuovi immobili e persone, insieme alle modifiche validate a persone già registrate e ai dati di riconoscimento, restano nella bozza fino alla conferma finale;
- la bozza contiene soltanto i dati necessari a riprendere e completare il workflow, non un Contratto già generato né il documento storico;
- il controllo di sovrapposizione avviene prima della registrazione definitiva;
- alla conferma valida viene acquisita la data corrente autorevole e viene costruito il `Contratto` con i dati finali;
- gli `Articolo` della tipologia sono template: il documento HTML completo viene generato soltanto alla conferma componendo le parti ordinate con i dati finali validati;
- il contenuto HTML viene assegnato al `Contratto` e costituisce la copia storica completa che non verrà rigenerata da modifiche successive ai template o ai dati sorgente;
- viene creato il primo `Pagamento` e associato al `Contratto`;
- il salvataggio dei dati definitivi è rappresentato come un'unica operazione logica coerente e atomica;
- dopo il completamento con successo della registrazione definitiva viene tentata l'eliminazione della bozza, ma tale cleanup non appartiene alla transazione dei dati definitivi;
- un errore nella cancellazione della bozza non invalida il contratto già registrato;
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
- generazione del Contratto e del relativo documento HTML esclusivamente dopo la conferma finale;
- memorizzazione nel Contratto della data di registrazione e del contenuto storico generato;
- registrazione definitiva coerente e atomica di Contratto, contenuto storico, primo Pagamento, eventuali nuovi dati e modifiche validate a Persone già registrate;
- cleanup della bozza successivo alla registrazione definitiva: un eventuale errore di cancellazione non annulla il risultato già persistito.

L'Activity Diagram non introduce componenti architetturali: usa i ruoli `Proprietario` e `Sistema` per descrivere il processo.

## Sequence Diagram UC-02
Il Sequence Diagram di UC-02 usa ruoli logici e non introduce ancora l'architettura definitiva.

Partecipanti:
- `Proprietario`: attore esterno;
- `Interfaccia UC-02`: punto di interazione con il proprietario;
- `Gestione UC-02`: ruolo logico che orchestra il caso d'uso;
- `Archivio dati`: ruolo astratto per il recupero e il salvataggio dei dati persistenti;
- `Contratto`: concetto di dominio che calcola importo e scadenza e protegge l'associazione dei pagamenti;
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
- alla conferma vengono ricaricati e rivalidati Contratto e Pagamenti autorevoli, senza fidarsi della preview precedente;
- il nuovo `Pagamento` viene aggiunto al `Contratto` tramite il comportamento di dominio `aggiungiPagamento` prima della persistenza;
- la scrittura persistente identifica esplicitamente il Contratto proprietario del nuovo Pagamento;
- un errore di salvataggio non deve produrre un falso esito positivo o dati incoerenti.

`Mensilità` non compare come partecipante autonomo perché nella baseline approvata è un concetto derivato, non un'entità del Domain Model.

## Class Diagram di design
`uml/class-diagram.puml` rappresenta Service applicativi, application model, porte, oggetti di dominio e comportamenti pubblici essenziali. È l'unico Class Diagram mantenuto nel repository; le sue revisioni precedenti sono recuperabili tramite Git.

Le classi di dominio persistibili usano `id : int`, coerente con la scelta PostgreSQL `INTEGER ... AS IDENTITY`. `BozzaContratto` non riceve un identificatore di dominio dedicato.

Gli application model sono `BozzaContratto` e `PagamentoDaRegistrare`. `BozzaContratto` conserva esclusivamente i dati necessari alla ripresa di UC-01: non contiene un Contratto già generato, documento HTML, copie di Articolo o Pagamenti definitivi. `PagamentoDaRegistrare` contiene i dati necessari alla preview di UC-02 senza costringere l'interfaccia a interrogare direttamente i repository.

`Articolo` è presente soltanto come template della `TipologiaContrattuale`, con `numArticolo` e `numParte` per rappresentare parti ordinate dello stesso articolo logico. Non esiste più un'associazione `Contratto`--`Articolo`.

La precedente classe `ContrattoRegistrato` è eliminata. `Contratto` conserva direttamente `registratoIl` e `contenuto`; nel lifecycle software `contenuto` può essere temporaneamente assente durante l'assemblaggio, ma deve essere presente prima della registrazione definitiva. Il contenuto concreto della v1.0 è HTML.

`GeneratoreDocumentoContratto` è una porta applicativa: produce il documento completo a partire dal `Contratto` e dai template raggiungibili tramite la relativa tipologia. `RegistraContrattoService` assegna il contenuto generato al Contratto prima di invocare `RegistrazioneContrattoPort`.

`DataCorrenteProvider` è condiviso dai due casi d'uso: UC-01 lo usa per valorizzare `registratoIl`, UC-02 per determinare competenze disponibili, scadenza e tardività.

Per UC-02, `PagamentoRepository` espone `salva(contrattoId : int, pagamento : Pagamento)`: la relazione persistente con il Contratto viene resa esplicita nella porta senza aggiungere `contrattoId` all'oggetto `Pagamento` né una back-reference verso `Contratto`. Il caso d'uso invoca prima `Contratto.aggiungiPagamento` per applicare le invarianti di dominio.

Lo stato temporale del Contratto è ottenuto tramite `statoAlla(data)` e non viene memorizzato con flag `inEssere` o `scaduto`.

## Tracciabilità UML corrente
| User Story | Requisiti | Acceptance Criteria | Caso d'uso | Artefatti UML correnti |
|---|---|---|---|---|
| US-01 | RF-01–RF-06 | AC-01–AC-09 | UC-01 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram.puml`, `uml/sequence-uc01.puml`, `uml/activity-uc01.puml` |
| US-02 | RF-07–RF-10 | AC-10–AC-15 | UC-02 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram.puml`, `uml/sequence-uc02.puml` |

## Esito finale della fase 02
La modellazione UML della versione 1.0 è approvata come baseline e le modifiche emerse durante la progettazione sono state propagate agli stessi artefatti versionati.

La catena coperta è:
- requisiti e acceptance criteria;
- casi d'uso;
- modello concettuale del dominio;
- Class Diagram di design mantenuto come unico artefatto versionato;
- comportamento dinamico di UC-01;
- comportamento dinamico di UC-02.

La **Fase 03 — Architettura, class design e SOLID** è completata nella baseline corrente. Le decisioni architetturali, lo stack, la persistenza, il confine transazionale di UC-01 e la review consolidata di SOLID/qualità sono documentati in `docs/architettura.md` e `uml/class-diagram.puml`. Eventuali incoerenze che emergeranno durante implementazione e test verranno trattate con review e refactoring mirati, aggiornando insieme gli artefatti coinvolti.

Le sorgenti PlantUML approvate dovranno essere esportate in PDF e inserite nella relazione LaTeX quando verrà predisposta la documentazione finale.
