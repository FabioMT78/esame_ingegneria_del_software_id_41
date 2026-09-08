# Modellazione UML — Gestionale Affitti
Questo documento raccoglie le decisioni di modellazione assunte e serve a mantenere coerenti requisiti, diagrammi UML e successive decisioni di design.

## Stato della fase
Artefatti:
- `uml/use-case.puml`
- `uml/domain-model.puml`

Artefatti da produrre progressivamente:
- `uml/class-diagram-initial.puml`
- `uml/sequence-uc01.puml`
- `uml/sequence-uc02.puml`
- `uml/activity-uc01.puml`

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
- un pagamento è tardivo quando viene registrato dopo la data di scadenza della mensilità.

La prima mensilità non richiede una regola di esclusione speciale durante UC-02: alla registrazione definitiva del Contratto viene creato e memorizzato il relativo `Pagamento`, con data coincidente con la data di decorrenza del Contratto.

Un eventuale oggetto software dedicato alla mensilità potrà essere valutato nel Class Diagram o nell'implementazione, se utile per il comportamento applicativo, senza trasformarlo automaticamente in entità persistente del dominio.

### Bozza di contratto
**Decisione:** `BozzaContratto` non appartiene al Domain Model.

La bozza rappresenta lo stato temporaneo e recuperabile della procedura guidata di UC-01. Verrà quindi resa esplicita nei diagrammi dinamici, in particolare:
- `uml/sequence-uc01.puml`;
- `uml/activity-uc01.puml`.

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

### Tipologia contrattuale e clausole
**Decisione:** modellare `TipologiaContrattuale` e `Clausola` come concetti autonomi del Domain Model.

La `TipologiaContrattuale` determina la durata del periodo iniziale del Contratto e l'insieme delle clausole predefinite applicabili. Nella versione 1.0 sono previste le tipologie a canone concordato (3 + 2) e a canone libero (4 + 4).

Attributi concettuali scelti per `TipologiaContrattuale`:
- denominazione;
- durata del periodo iniziale.

Attributo concettuale essenziale per `Clausola`:
- testo.

**Cardinalità:**
- ogni `TipologiaContrattuale` possiede `1..*` `Clausola` predefinite;
- ogni `Clausola` appartiene a una sola `TipologiaContrattuale`;
- ogni `Contratto` fa riferimento a una sola `TipologiaContrattuale`;
- una `TipologiaContrattuale` può essere utilizzata da `0..*` `Contratto`.

Non viene introdotta una relazione molti-a-molti tra tipologie e clausole: nella versione 1.0 non è richiesta la condivisione della stessa Clausola tra più tipologie. Se in futuro emergesse questa esigenza, il modello potrebbe essere rivisto.

Le clausole applicabili a un `Contratto` derivano dalla `TipologiaContrattuale` selezionata; non viene quindi introdotta nel Domain Model una seconda associazione diretta `Contratto`--`Clausola`.

### Pagamento e storia dei pagamenti del Contratto
**Decisione:** `Pagamento` è un concetto del dominio distinto dal caso d'uso **UC-02 — Registrare il pagamento di un canone**.

`Pagamento` rappresenta il fatto storico che una determinata mensilità di un Contratto è stata pagata; UC-02 rappresenta invece l'azione applicativa che registra un nuovo Pagamento.

Per `Pagamento` è necessario rappresentare almeno:
- `meseCompetenza`, che identifica la mensilità a cui il pagamento si riferisce;
- `dataPagamento`, che rappresenta la data effettiva di pagamento.

L'importo non è necessario come attributo concettuale nella versione 1.0, perché deriva dal canone mensile del Contratto e non sono ammessi pagamenti parziali.

La cardinalità approvata è:
- un `Contratto` possiede da **1 a molti** `Pagamento`;
- ogni `Pagamento` appartiene a **un solo** `Contratto`;
- ogni `Pagamento` si riferisce a una sola mensilità del Contratto;
- per ciascun `meseCompetenza` del Contratto può esistere al massimo un `Pagamento` registrato.

Alla registrazione definitiva del `Contratto`, UC-01 crea e memorizza già il `Pagamento` relativo alla prima mensilità, con data coincidente con la data di decorrenza del Contratto. I Pagamenti successivi sono aggiunti tramite UC-02.

## Concetti del Domain Model
I concetti  del Domain Model sono:
- `Persona`;
- `Immobile`;
- `Indirizzo`;
- `DatiCatastali`;
- `Contratto`;
- `TipologiaContrattuale`;
- `Clausola`;
- `Pagamento`;
- `DocumentoRiconoscimento`.

Per `Contratto` gli attributi essenziali sono:
- nome o breve descrizione;
- data iniziale `dal`;
- data finale derivata `/al`;
- canone mensile;
- giorno di pagamento.

La data finale `/al` resta visibile perché è semanticamente rilevante per il periodo contrattuale e per il vincolo di non sovrapposizione, ma è marcata come derivata poiché viene determinata da `dal` e dalla `TipologiaContrattuale`.

## Vincoli di dominio
- il codice fiscale identifica una Persona registrata;
- ogni Persona è associata a un Indirizzo di residenza; più Persone possono condividere lo stesso Indirizzo;
- una Persona può avere al massimo un DocumentoRiconoscimento nella versione 1.0;
- per una Persona che assume il ruolo di inquilino devono essere disponibili i dati del documento di riconoscimento previsti dai requisiti;
- il giorno di pagamento è compreso tra 1 e 28;
- la data finale del periodo iniziale è determinata dalla data iniziale e dalla tipologia contrattuale;
- i periodi di due contratti relativi allo stesso Immobile non possono sovrapporsi;
- alla registrazione definitiva del Contratto viene registrato il pagamento della prima mensilità con data coincidente con la data di decorrenza;
- ogni Contratto registrato possiede almeno un Pagamento;
- per ciascun `meseCompetenza` del Contratto può esistere al massimo un Pagamento registrato;
- una mensilità è pagabile dal primo giorno del relativo mese di competenza;
- una mensilità diventa dovuta dal giorno di pagamento previsto dal Contratto, compreso;
- un Pagamento registrato dopo la scadenza della relativa mensilità è tardivo;
- i pagamenti parziali sono fuori scope;
- una mensilità già pagata non può essere proposta nuovamente;
- le mensilità appartenenti a mesi successivi a quello corrente non possono essere proposte per la registrazione del pagamento.

## Esito della review del Domain Model
La review complessiva del diagramma ha confermato la coerenza del modello con i requisiti e con le decisioni documentate. Prima dell'approvazione definitiva sono state recepite le seguenti rifiniture:
- `Contratto.al` è rappresentato come attributo derivato `/al`;
- `Pagamento.periodoRiferimento` è stato rinominato `meseCompetenza`;
- il vincolo sul primo pagamento è espresso staticamente come `dataPagamento = Contratto.dal` per la prima mensilità, lasciando ai diagrammi dinamici la descrizione della sua creazione durante UC-01;
- `DocumentoRiconoscimento` esplicita il vincolo della versione 1.0 sui tipi ammessi: carta d'identità o passaporto;
- `TipologiaContrattuale` esplicita le due tipologie supportate nella versione 1.0: canone concordato 3+2 e canone libero 4+4.

Il Domain Model è quindi **assuunto** come baseline concettuale per i successivi artefatti UML.

## Stato del Domain Model
Il Domain Model è scelto. Le decisioni concettuali necessarie per la baseline della fase 02 sono consolidate.

Sono approvate:
- `Persona` con i ruoli associativi `proprietario` e `inquilino`;
- `Indirizzo` condiviso tra ubicazione dell'`Immobile` e residenza della `Persona`;
- `DocumentoRiconoscimento` come concetto autonomo, opzionale in generale ma obbligatorio per il ruolo di inquilino;
- `DatiCatastali` come concetto autonomo e identificazione catastale basata su codice comunale, foglio, particella e subalterno;
- `Mensilità` come concetto derivato, non come entità autonoma;
- `BozzaContratto` esclusa dal Domain Model e rinviata ai diagrammi dinamici;
- `Contratto` ↔ `Pagamento` con cardinalità `1` ↔ `1..*`;
- `TipologiaContrattuale` ↔ `Clausola` con cardinalità `1` ↔ `1..*`, senza condivisione di una stessa Clausola tra più tipologie.

## Tracciabilità UML corrente
| User Story | Requisiti | Acceptance Criteria | Caso d'uso | Artefatto UML |
|---|---|---|---|---|
| US-01 | RF-01–RF-06 | AC-01–AC-09 | UC-01 | `uml/use-case.puml` |
| US-02 | RF-07–RF-10 | AC-10–AC-15 | UC-02 | `uml/use-case.puml` |
