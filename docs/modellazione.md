# Modellazione UML — Gestionale Affitti

Questo documento descrive le decisioni di modellazione della versione 1.0 di **Gestionale Affitti** e fornisce la chiave di lettura dei diagrammi UML. I requisiti e gli acceptance criteria restano la fonte autorevole del comportamento richiesto; i diagrammi UML rappresentano invece attori, concetti, relazioni, struttura software e collaborazioni significative.

## 1. Obiettivo del documento

La modellazione è mantenuta essenziale e concentrata sui due casi d'uso core:

- **UC-01 — Registrare un contratto di locazione**;
- **UC-02 — Registrare il pagamento di un canone**.

Il Domain Model rappresenta i concetti del dominio senza introdurre dettagli di database o framework. Il Class Diagram raffina tali concetti nella struttura software. Sequence e Activity Diagram descrivono invece le collaborazioni e il flusso dei casi d'uso senza trasformarsi in una seconda specifica dei requisiti.

Gli aspetti architetturali e infrastrutturali sono approfonditi in `docs/architettura.md`.

## 2. Use Case Model

La versione 1.0 ha un solo attore diretto: il **Proprietario**.

Il Proprietario interagisce con il sistema per:

- registrare un contratto di locazione;
- registrare il pagamento di un canone.

L'`Inquilino` non è un attore del sistema nella versione 1.0: è un ruolo assunto da una `Persona` nell'ambito di un `Contratto`.

Nel Use Case Diagram non vengono introdotti `<<include>>`, `<<extend>>` o generalizzazioni, perché i requisiti non individuano comportamenti autonomi riutilizzati o estensioni opzionali che ne giustifichino l'uso.

## 3. Domain Model

I concetti rappresentati nel Domain Model sono:

- `Persona`;
- `Immobile`;
- `Indirizzo`;
- `DatiCatastali`;
- `DocumentoRiconoscimento`;
- `Contratto`;
- `TipologiaContrattuale`;
- `Articolo`;
- `Pagamento`.

`Mensilità` e `BozzaContratto` non sono entità del Domain Model: la prima è un concetto derivato, la seconda appartiene al workflow applicativo.

### 3.1 Persona e ruoli contrattuali

`Persona` rappresenta il soggetto anagrafico comune. `Proprietario` e `Inquilino` non sono sottotipi distinti, ma ruoli assunti da una Persona rispetto a un Contratto.

Il modello usa quindi due associazioni nominate fra `Persona` e `Contratto`:

- `proprietario`;
- `inquilino`.

La stessa Persona può partecipare a più contratti nel tempo e assumere ruoli differenti in rapporti contrattuali diversi.

Il codice fiscale identifica una Persona registrata. I dati anagrafici richiesti comprendono nome, cognome, luogo e data di nascita, codice fiscale e residenza.

La residenza non è modellata come un gruppo di attributi interno a `Persona`: viene riutilizzato il concetto `Indirizzo` tramite l'associazione `residenza`. Ogni Persona ha un solo indirizzo di residenza, mentre più Persone possono condividere lo stesso Indirizzo.

### 3.2 Immobile, Indirizzo e DatiCatastali

`Immobile`, `Indirizzo` e `DatiCatastali` sono concetti distinti.

Un Immobile possiede un nome leggibile assegnato dal proprietario; tale nome non è univoco e non determina l'identità dell'immobile. Ogni Immobile è associato a un solo `Indirizzo` di ubicazione e a un solo insieme di `DatiCatastali`.

`Indirizzo` è condiviso fra ubicazione dell'Immobile e residenza della Persona. Gli attributi concettuali rappresentati sono:

- nazione;
- provincia;
- comune;
- CAP;
- indirizzo;
- civico;
- scala, se presente;
- interno, se presente.

Per l'ubicazione di un Immobile valgono i dati previsti dai requisiti; per la residenza di una Persona sono obbligatori almeno provincia, comune, indirizzo e numero civico. Il riuso dello stesso concetto non rende automaticamente obbligatori per la residenza tutti gli attributi necessari all'ubicazione di un immobile.

Quando l'interno è specificato per un Immobile, l'indirizzo completo non può duplicare quello di un altro Immobile registrato.

`DatiCatastali` contiene:

- codice comunale;
- foglio;
- particella;
- subalterno;
- categoria;
- consistenza;
- rendita.

La combinazione `codice comunale + foglio + particella + subalterno` identifica univocamente l'Immobile. `categoria`, `consistenza` e `rendita` descrivono caratteristiche catastali ma non partecipano all'identificazione.

### 3.3 Documento di riconoscimento

`DocumentoRiconoscimento` è modellato come concetto autonomo perché rappresenta un elemento riconoscibile del dominio e la sua presenza è soggetta a una regola specifica.

Gli attributi concettuali sono:

- tipo, limitato nella versione 1.0 a carta d'identità o passaporto;
- organo emittente;
- data di rilascio;
- data di scadenza;
- numero del documento.

Una `Persona` può avere `0..1` DocumentoRiconoscimento e ogni DocumentoRiconoscimento appartiene a una sola Persona. Quando una Persona assume il ruolo di inquilino in un Contratto, il documento deve essere presente.

La versione 1.0 non gestisce storico o pluralità di documenti per la stessa Persona.

### 3.4 Contratto e TipologiaContrattuale

`Contratto` rappresenta il rapporto di locazione registrato. Gli attributi concettuali essenziali sono:

- nome o breve descrizione;
- data iniziale `dal`;
- data finale derivata `/al`;
- canone mensile;
- giorno di pagamento;
- data di registrazione `registratoIl`;
- `contenuto`, copia completa del documento generato;
- stato temporale derivato `/stato`.

Le date `dal` e `al` appartengono entrambe al periodo contrattuale. Due Contratti relativi allo stesso Immobile non possono avere periodi sovrapposti.

`TipologiaContrattuale` descrive la tipologia scelta tramite:

- `denominazione`;
- `durata`, espressa in anni e riferita al periodo iniziale;
- `rinnovo`, espresso in anni.

Per le tipologie supportate nella versione 1.0:

- canone concordato 3+2: `durata = 3`, `rinnovo = 2`;
- canone libero 4+4: `durata = 4`, `rinnovo = 4`.

La data `/al` è derivata esclusivamente da `dal` e `TipologiaContrattuale.durata`: corrisponde all'anniversario della decorrenza dopo il numero di anni previsto, meno un giorno. Il valore `rinnovo` descrive la tipologia ma non estende il periodo gestito nella versione 1.0 e non introduce un caso d'uso di rinnovo.

`registratoIl` è valorizzato alla registrazione definitiva. Prima di tale momento non esiste un Contratto registrato incompleto: lo stato temporaneo della procedura è rappresentato separatamente dalla bozza applicativa.

Lo stato futuro, in essere o scaduto non viene modellato come flag persistente, perché è derivato dal periodo rispetto alla data corrente.

### 3.5 Articolo e contenuto storico

`Articolo` rappresenta esclusivamente un template appartenente a una `TipologiaContrattuale`; non esistono copie di Articolo associate al Contratto registrato.

Gli attributi concettuali sono:

- `numArticolo`;
- `numParte`;
- `titolo`;
- `sottotitolo`, opzionale;
- `descrizione`.

Uno stesso articolo logico può essere suddiviso in più parti ordinate. `numArticolo` identifica l'articolo, mentre `numParte` determina l'ordine dei frammenti. La coppia `numArticolo + numParte` è univoca all'interno della TipologiaContrattuale.

Ogni TipologiaContrattuale possiede almeno un Articolo template. Le parti vengono usate per comporre il documento definitivo inserendo i dati dinamici acquisiti durante UC-01.

La copia storica completa del documento viene conservata direttamente in `Contratto.contenuto`. Il Domain Model non prescrive il formato tecnico del contenuto: la scelta concreta della versione 1.0 è documentata in `docs/architettura.md`.

Il contenuto storico non deve dipendere da successive modifiche dei template o dei dati sorgente utilizzati per generarlo.

### 3.6 Pagamento e competenze mensili

`Pagamento` rappresenta un fatto storico associato a un solo Contratto. UC-02 è l'azione applicativa che registra il pagamento; `Pagamento` è invece il risultato persistente dell'operazione.

Gli attributi concettuali sono:

- `annoCompetenza`;
- `meseCompetenza`, compreso tra 1 e 12;
- `dataPagamento`;
- `importo`.

Un Contratto registrato possiede almeno un Pagamento. Per la stessa coppia `annoCompetenza + meseCompetenza` dello stesso Contratto può esistere al massimo un Pagamento.

`Mensilità` non viene modellata come entità autonoma. La competenza mensile è derivata da:

- periodo del Contratto;
- giorno di pagamento;
- anno e mese di competenza;
- Pagamenti già registrati.

Una competenza è pagabile dal primo giorno del relativo mese, diventa dovuta dal giorno di pagamento previsto dal Contratto, compreso, ed è futura se appartiene a un mese successivo a quello corrente. Un Pagamento registrato dopo la scadenza della competenza è tardivo, ma resta consentito.

L'importo è determinato dal Contratto e memorizzato nel Pagamento come dato storico:

- per una competenza interamente coperta coincide con `canoneMensile`;
- la prima competenza è calcolata in pro-rata quando `dal` non coincide con il primo giorno del mese;
- l'ultima competenza è calcolata in pro-rata quando `al` non coincide con l'ultimo giorno del mese;
- il calcolo usa `canoneMensile * giorniCoperti / giorniDelMese`;
- non vengono effettuati arrotondamenti intermedi;
- il risultato finale viene arrotondato a due cifre decimali.

Il pro-rata rappresenta l'importo completo dovuto per la parte di mese coperta dal Contratto e non costituisce un pagamento parziale. I pagamenti parziali restano fuori scope.

Alla registrazione definitiva del Contratto viene creato il Pagamento della prima competenza con anno e mese ricavati da `dal`, `dataPagamento = dal` e importo calcolato secondo le regole della competenza iniziale. I Pagamenti successivi sono aggiunti tramite UC-02.

### 3.7 BozzaContratto e confine del Domain Model

`BozzaContratto` non appartiene al Domain Model. Rappresenta lo stato temporaneo e recuperabile della procedura guidata di UC-01 ed è quindi un application model.

Nuovi Immobili, nuove Persone, eventuali modifiche validate a Persone esistenti e dati del DocumentoRiconoscimento rimangono nella bozza fino alla conferma definitiva. L'annullamento della procedura non rende permanenti tali dati.

La bozza non rappresenta un Contratto incompleto e non contiene il documento storico o Pagamenti definitivi. Il suo lifecycle e il comportamento di recupero sono rappresentati nei diagrammi dinamici; le decisioni architetturali relative alla sua persistenza appartengono a `docs/architettura.md`.

## 4. Vincoli concettuali principali

Il Domain Model rende espliciti i vincoli necessari a comprenderne struttura e significato:

- il codice fiscale identifica una Persona registrata;
- una Persona che assume il ruolo di inquilino deve disporre del DocumentoRiconoscimento richiesto;
- la combinazione catastale identifica univocamente un Immobile;
- il giorno di pagamento è compreso tra 1 e 28;
- la data `/al` è derivata da `dal` e dalla durata iniziale della TipologiaContrattuale;
- il rinnovo della tipologia non estende il periodo gestito nella versione 1.0;
- i periodi di due Contratti dello stesso Immobile non possono sovrapporsi;
- ogni TipologiaContrattuale possiede almeno un Articolo template;
- `numArticolo + numParte` identifica una parte di articolo all'interno della stessa tipologia;
- gli Articoli template non fanno parte della storia del Contratto registrato;
- ogni Contratto registrato conserva `registratoIl`, `contenuto` e almeno un Pagamento;
- lo stato temporale del Contratto è derivato e non memorizzato come flag;
- per ogni Contratto può esistere al massimo un Pagamento per anno e mese di competenza;
- le mensilità future e quelle già pagate non possono essere proposte per una nuova registrazione di pagamento.

Le regole comportamentali complete e i relativi acceptance criteria restano documentati in `docs/requisiti.tex`.

## 5. Raffinamento verso il Class Diagram

`uml/class-diagram.puml` traduce il modello concettuale nella struttura software necessaria ai due casi d'uso. Introduce Service applicativi, application model e porte, mantenendo separati dominio e infrastruttura.

Il Class Diagram conserva i concetti del Domain Model e aggiunge i tipi software essenziali. Le firme pubbliche delle operazioni e delle porte sono autorevolmente rappresentate nel diagramma e, successivamente, nel codice; non vengono replicate integralmente in questo documento.

Due differenze rispetto al Domain Model sono intenzionali:

- `BozzaContratto` e `PagamentoDaRegistrare` compaiono come application model perché servono al workflow, ma non sono concetti del dominio;
- nel Domain Model un Contratto registrato possiede `contenuto` e almeno un Pagamento, mentre nel Class Diagram tali elementi possono essere temporaneamente assenti durante l'assemblaggio in memoria prima della registrazione definitiva.

`Articolo` resta associato soltanto alla `TipologiaContrattuale`; non esiste un'associazione `Contratto`--`Articolo`. La storia del documento è responsabilità di `Contratto.contenuto`.

`Contratto` espone i comportamenti di dominio necessari ai casi d'uso, fra cui verifica della sovrapposizione, calcolo di importo e scadenza delle competenze, stato temporale, impostazione del contenuto e aggiunta dei Pagamenti.

Le responsabilità dei Service, le porte applicative, la Dependency Rule e le scelte di persistenza sono descritte in `docs/architettura.md`.

## 6. Diagrammi dinamici

I diagrammi dinamici usano partecipanti logici per descrivere collaborazioni e flussi significativi. I ruoli `Interfaccia`, `Gestione` e `Archivio dati` non implicano una corrispondenza uno-a-uno con classi concrete.

### 6.1 Sequence Diagram UC-01

`uml/sequence-uc01.puml` rappresenta le collaborazioni necessarie per registrare un contratto.

Il diagramma mette in evidenza in particolare:

- recupero dell'eventuale bozza e distinzione fra bozza riprendibile e bozza residua di una registrazione già completata;
- aggiornamento della bozza dopo gli step validi, senza persistenza definitiva anticipata dei nuovi dati o delle modifiche;
- controllo della sovrapposizione prima della registrazione;
- costruzione del Contratto soltanto alla conferma finale;
- generazione del contenuto storico a partire dai template e dai dati finali;
- creazione del primo Pagamento;
- registrazione definitiva come operazione logica coerente e atomica;
- cleanup della bozza successivo al successo, senza invalidare il Contratto in caso di errore di cancellazione;
- conservazione della bozza in caso di errore della registrazione definitiva.

Il confronto usato per riconoscere una bozza residua utilizza, quando tutti disponibili, identificazione catastale dell'Immobile, codice fiscale dell'Inquilino e periodo `dal`--`al`. Solo la coincidenza di tutti e tre gli elementi con un Contratto già registrato consente di eliminarla automaticamente come residua.

### 6.2 Activity Diagram UC-01

`uml/activity-uc01.puml` completa il Sequence Diagram mostrando il flusso end-to-end della procedura guidata.

Il diagramma evidenzia:

- ripresa o avvio della procedura;
- avanzamento attraverso i sei step;
- cicli di validazione e correzione prima dell'avanzamento;
- distinzione tra selezione di dati esistenti e acquisizione di nuovi dati;
- aggiornamento progressivo della bozza;
- possibilità di annullamento prima della conferma;
- ritorno alla modifica in presenza di sovrapposizione;
- registrazione definitiva soltanto dopo conferma valida;
- cleanup della bozza dopo il completamento positivo.

L'Activity Diagram usa i ruoli `Proprietario` e `Sistema` e non introduce componenti architetturali.

### 6.3 Sequence Diagram UC-02

`uml/sequence-uc02.puml` rappresenta la collaborazione necessaria per registrare il pagamento di un canone.

Il diagramma evidenzia:

- selezione dell'Immobile e individuazione dell'Inquilino associato;
- recupero di Contratti e Pagamenti esistenti;
- individuazione della competenza non pagata cronologicamente più vecchia fino al mese corrente;
- esclusione delle competenze future e già pagate;
- possibilità di pagare la competenza corrente dal primo giorno del mese, anche prima del giorno di pagamento;
- calcolo di importo e scadenza da parte del Contratto;
- preview applicativa prima della conferma;
- rivalidazione dei dati autorevoli alla conferma, senza considerare la preview come fonte definitiva;
- creazione e associazione del nuovo Pagamento soltanto se la competenza è ancora registrabile;
- assenza di effetti persistenti in caso di annullamento o di competenza non disponibile.

`Mensilità` non compare come partecipante autonomo perché resta un concetto derivato.

Non viene prodotto un Activity Diagram per UC-02: il relativo Sequence Diagram descrive già il flusso, le alternative e gli errori significativi senza richiedere un secondo diagramma che aggiungerebbe soprattutto duplicazione.

## 7. Artefatti UML

Gli artefatti di modellazione della versione 1.0 sono:

- `uml/use-case.puml` — attore e obiettivi dei due casi d'uso core;
- `uml/domain-model.puml` — concetti del dominio, attributi, cardinalità e vincoli concettuali;
- `uml/class-diagram.puml` — struttura software di design;
- `uml/sequence-uc01.puml` — collaborazioni di UC-01;
- `uml/activity-uc01.puml` — flusso end-to-end di UC-01;
- `uml/sequence-uc02.puml` — collaborazioni di UC-02.

Il Class Diagram è l'unico diagramma strutturale di design mantenuto nel repository; il Domain Model rimane separato perché ha una responsabilità concettuale differente.

### Tracciabilità UML essenziale

Fino alla predisposizione dell'artefatto di tracciabilità finale, il collegamento essenziale fra requisiti e diagrammi è mantenuto qui per evitare la perdita dell'informazione:

| User Story | Requisiti | Acceptance Criteria | Caso d'uso | Artefatti UML |
|---|---|---|---|---|
| US-01 | RF-01–RF-06 | AC-01–AC-09 | UC-01 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram.puml`, `uml/sequence-uc01.puml`, `uml/activity-uc01.puml` |
| US-02 | RF-07–RF-10 | AC-10–AC-15 | UC-02 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram.puml`, `uml/sequence-uc02.puml` |

Le sorgenti PlantUML costituiscono la versione autorevole dei diagrammi e saranno esportate in PDF per la relazione finale.
