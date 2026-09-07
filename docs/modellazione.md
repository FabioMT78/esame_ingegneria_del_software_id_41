# Modellazione UML — Gestionale Affitti
Questo documento raccoglie le decisioni di modellazione assunte e serve a mantenere coerenti requisiti, diagrammi UML e successive decisioni di design.

## Stato della fase
Artefatti approvati:
- `uml/use-case.puml`
- `uml/domain-model.puml`

Artefatti prodotti e in review:
- `uml/class-diagram-initial.puml`

Artefatti da produrre progressivamente:
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

Le istanze di `Articolo` associate alla `TipologiaContrattuale` rappresentano i modelli predefiniti e possono contenere dati da valorizzare durante UC-01. Alla registrazione definitiva il sistema ne crea copie distinte, valorizzate con i dati acquisiti, e le associa al `Contratto`.

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

L'importo viene determinato automaticamente dal `canoneMensile` del Contratto al momento della registrazione e viene memorizzato nel `Pagamento` per preservare il dato storico. I pagamenti parziali restano fuori scope.

La cardinalità approvata è:
- un `Contratto` possiede da **1 a molti** `Pagamento`;
- ogni `Pagamento` appartiene a **un solo** `Contratto`;
- per la stessa coppia `annoCompetenza + meseCompetenza` dello stesso Contratto può esistere al massimo un `Pagamento`.

Alla registrazione definitiva del `Contratto`, UC-01 crea e memorizza il `Pagamento` della prima mensilità con:
- `annoCompetenza` e `meseCompetenza` ricavati dalla data `dal`;
- `dataPagamento = Contratto.dal`;
- `importo = Contratto.canoneMensile`.

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
- alla registrazione definitiva del Contratto viene registrato il pagamento della prima mensilità con anno e mese di competenza ricavati da `dal`, `dataPagamento = dal` e `importo = canoneMensile`;
- ogni Contratto registrato possiede almeno un Pagamento;
- `meseCompetenza` è compreso tra 1 e 12;
- per la stessa coppia `annoCompetenza + meseCompetenza` dello stesso Contratto può esistere al massimo un Pagamento;
- l'importo del Pagamento viene determinato dal canone mensile del Contratto al momento della registrazione e memorizzato come dato storico;
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

## Tracciabilità UML corrente
| User Story | Requisiti | Acceptance Criteria | Caso d'uso | Artefatti UML correnti |
|---|---|---|---|---|
| US-01 | RF-01–RF-06 | AC-01–AC-09 | UC-01 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram-initial.puml` |
| US-02 | RF-07–RF-10 | AC-10–AC-15 | UC-02 | `uml/use-case.puml`, `uml/domain-model.puml`, `uml/class-diagram-initial.puml` |
