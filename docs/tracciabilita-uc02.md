# Tracciabilità UC-02 — Registrazione del pagamento del canone

Questo documento raccoglie la tracciabilità end-to-end di **UC-02 — Registrare il pagamento di un canone**. Non sostituisce `docs/requisiti.tex`, che rimane la fonte autorevole per comportamento richiesto e acceptance criteria, né gli UML, che rimangono autorevoli per gli aspetti modellati.

La catena mantenuta è:

`Requisito → Acceptance Criteria → Caso d'uso → UML → Componente → Codice → Test`.

## Matrice di tracciabilità

| Requisito | Acceptance Criteria | Caso d'uso | UML | Componenti principali | Codice principale | Test principali |
|---|---|---|---|---|---|---|
| RF-07 — selezione univoca dell'Immobile e individuazione dell'Inquilino | AC-10 | UC-02 | `uml/use-case.puml`, `uml/sequence-uc02.puml`, `uml/class-diagram.puml` | `RegistraPagamentoService`, `RegistraPagamentoController`, frontend UC-02 | `src/application/RegistraPagamentoService.ts`, `src/web/RegistraPagamentoController.ts`, `src/web/Uc02HttpOutput.ts`, `public/pagamenti.html`, `public/js/pagamenti.js` | `test/application/RegistraPagamentoService.test.ts`, `test/web/RegistraPagamentoHttp.test.ts`, `test/web/StaticFrontendHttp.test.ts`, `test/integration/uc02/RegistraPagamentoEndToEnd.test.ts` |
| RF-08 — individuazione automatica della mensilità non pagata più vecchia, esclusione di pagate e future, blocco se assente | AC-11, AC-12 | UC-02 | `uml/domain-model.puml`, `uml/sequence-uc02.puml`, `uml/class-diagram.puml` | `RegistraPagamentoService`, `ContrattoRepository`, `PagamentoDaRegistrare` | `src/application/RegistraPagamentoService.ts`, `src/application/model/PagamentoDaRegistrare.ts`, `src/application/ports/ContrattoRepository.ts`, `src/infrastructure/persistence/postgres/PostgresContrattoRepository.ts` | `test/application/RegistraPagamentoService.test.ts`, `test/integration/postgres/PostgresContrattoRepository.test.ts`, `test/integration/uc02/RegistraPagamentoEndToEnd.test.ts` |
| RF-09 — importo automatico, pro-rata di confine, competenza, data server e pagamento tardivo | AC-13, AC-14 | UC-02 | `uml/domain-model.puml`, `uml/class-diagram.puml`, `uml/sequence-uc02.puml` | `Contratto`, `Pagamento`, `RegistraPagamentoService`, `DataCorrenteProvider` | `src/domain/Contratto.ts`, `src/domain/Pagamento.ts`, `src/application/RegistraPagamentoService.ts`, `src/application/ports/DataCorrenteProvider.ts`, `src/infrastructure/time/DataCorrenteSistemaProvider.ts` | `test/domain/Contratto.test.ts`, `test/domain/Pagamento.test.ts`, `test/application/RegistraPagamentoService.test.ts`, `test/integration/uc02/RegistraPagamentoEndToEnd.test.ts` |
| RF-10 — Pagato, conferma esplicita, Annulla senza persistenza | AC-15 | UC-02 | `uml/sequence-uc02.puml`, `uml/class-diagram.puml` | frontend UC-02, `RegistraPagamentoController`, `RegistraPagamentoService`, `PagamentoRepository` | `public/pagamenti.html`, `public/js/pagamenti.js`, `src/web/RegistraPagamentoController.ts`, `src/application/RegistraPagamentoService.ts`, `src/application/ports/PagamentoRepository.ts`, `src/infrastructure/persistence/postgres/PostgresPagamentoRepository.ts` | `test/application/RegistraPagamentoService.test.ts`, `test/web/RegistraPagamentoHttp.test.ts`, `test/integration/postgres/PostgresPagamentoRepository.test.ts`, `test/integration/uc02/RegistraPagamentoEndToEnd.test.ts` |

## Vincoli trasversali rilevanti per UC-02

`DataCorrenteProvider` rende la data server autorevole e sostituibile nei test. La preview `PagamentoDaRegistrare` è un application model di sola visualizzazione: alla conferma `RegistraPagamentoService` ricarica i dati persistiti, individua nuovamente la competenza registrabile e ricalcola l'importo prima di creare il `Pagamento`.

`PagamentoRepository` è una porta orientata alla sola scrittura richiesta da UC-02. I Pagamenti storici vengono invece ricostruiti insieme al `Contratto` da `ContrattoRepository`; in questo modo il caso d'uso non possiede due percorsi concorrenti per leggere lo stesso stato.

Il vincolo PostgreSQL `UNIQUE (contratto_id, anno_competenza, mese_competenza)` costituisce una protezione secondaria della persistenza. Non sostituisce la rivalidazione applicativa, che impedisce anche di confermare una preview diventata obsoleta o di saltare una competenza precedente.

Per RNF-04, gli errori di persistenza vengono propagati e non producono un falso successo; il conflitto causato da una preview non più valida è tradotto dal confine HTTP in `409`. Per RNF-05 il frontend rende visibili gli stati di caricamento, successo ed errore durante le operazioni asincrone.

RNF-02 non viene dichiarato verificato da questa matrice: `docs/requisiti.tex` mantiene aperta la definizione riproducibile delle condizioni nominali e dell'ambiente di misura per il limite prestazionale.

## Scenario end-to-end verificato

`test/integration/uc02/RegistraPagamentoEndToEnd.test.ts` attraversa il confine HTTP, il Service applicativo, le implementazioni PostgreSQL delle porte e lo schema reale di test. Lo scenario positivo parte da un Contratto con la prima competenza già pagata, ottiene la preview della competenza successiva, conferma e verifica il nuovo record persistito con data server e importo autorevole.

Lo scenario di errore prepara una preview e modifica lo stato persistito prima della conferma. La conferma deve quindi restituire conflitto, senza creare duplicati né registrare una competenza diversa da quella esplicitamente confermata.
