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
- **Fase 02 — Modellazione UML**, comprendente:
  - Use Case Diagram;
  - Domain Model;
  - Class Diagram iniziale;
  - Sequence Diagram di UC-01;
  - Activity Diagram di UC-01;
  - Sequence Diagram di UC-02.

La baseline UML approvata è documentata in [`docs/modellazione.md`](docs/modellazione.md).

Fase in corso:
- **Fase 03 — Architettura, class design e SOLID**. Sono già state consolidate l'architettura client-server con backend monolitico layered, la separazione `interface` / `application` / `domain` / `infrastructure`, le responsabilità applicative dei due casi d'uso, la gestione della bozza, il DIP sulle dipendenze infrastrutturali e la granularità iniziale delle porte di persistenza.

Le decisioni approvate della fase corrente sono documentate in [`docs/architettura.md`](docs/architettura.md). Restano da definire il confine transazionale di UC-01, il Class Diagram di design definitivo, l'analisi dei pattern, la persistenza concreta e lo stack tecnologico.

## Quickstart

Il progetto non dispone ancora di un'implementazione eseguibile: stack tecnologico, dipendenze e comandi di avvio verranno definiti nella fase di progettazione e setup.

Questa sezione verrà aggiornata non appena sarà disponibile il primo incremento eseguibile e conterrà esclusivamente comandi verificati e riproducibili per:

```text
1. clonare il repository
2. installare le dipendenze
3. eseguire build e test
4. avviare l'applicazione
```

## Usage

La versione `1.0` sarà utilizzata dal **proprietario**, unico attore che interagisce direttamente con il sistema.

I due flussi principali previsti sono:

1. registrazione di un nuovo contratto di locazione relativo all'intero immobile;
2. registrazione del pagamento mensile del canone relativo a un contratto esistente.

La versione `1.0` non gestisce, tra le altre funzionalità, autenticazione e autorizzazione, locazione parziale, rinnovi contrattuali, pagamenti parziali, trasferimenti bancari reali, firma o registrazione fiscale del contratto.

Per i dettagli comportamentali e i criteri di accettazione fare riferimento a [`docs/requisiti.tex`](docs/requisiti.tex).

## Configurazione

La configurazione applicativa non è ancora definita perché lo stack tecnologico non è stato scelto.

## Test

La suite automatica verrà introdotta insieme ai primi incrementi implementativi dei due casi d'uso core.

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
  - `uml/class-diagram-initial.puml`;
  - `uml/sequence-uc01.puml`;
  - `uml/activity-uc01.puml`;
  - `uml/sequence-uc02.puml`;
- relazione: `docs/` (da aggiungere nelle fasi successive);
- ADR separati: da aggiungere soltanto se emergeranno decisioni architetturali che richiedono una trattazione autonoma rispetto a `docs/architettura.md`;
- changelog: da aggiungere prima della prima release.

Le sorgenti PlantUML approvate verranno esportate in PDF e inserite nella relazione LaTeX nella fase di documentazione finale.

## Release

La release finale del progetto sarà identificata tramite un tag Git, ad esempio `v1.0.0`, dopo la verifica di build, test, CI, documentazione e tracciabilità.
