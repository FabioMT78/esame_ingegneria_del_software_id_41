# Changelog

Le modifiche rilevanti del progetto sono documentate in questo file.

## [1.0.0] - 2026-09-14

### Aggiunto

- UC-01 completo per la registrazione guidata di un contratto di locazione con bozze recuperabili, validazione progressiva, anteprima documentale e registrazione definitiva atomica.
- UC-02 completo per la registrazione del pagamento della mensilità non pagata cronologicamente più vecchia, con preview, conferma esplicita, rivalidazione e persistenza PostgreSQL.
- Domain model per Persone, Immobili, Dati catastali, Contratti, Tipologie contrattuali, Articoli e Pagamenti.
- Generazione HTML del contenuto storico del contratto a partire da template versionati.
- Persistenza PostgreSQL, migration, seed idempotente dei template e vincoli di integrità.
- Controllo centralizzato degli input HTTP con rilevazione trasversale di pattern sospetti riconducibili a XSS e SQL injection, logging tecnico e rifiuto delle richieste non ammesse.
- Test unitari, HTTP, infrastrutturali, PostgreSQL, test dedicati alla sicurezza degli input e scenario end-to-end di UC-02.
- Quality gate `npm run verify` e pipeline GitHub Actions.
- Documentazione di requisiti, modellazione, architettura, tracciabilità e relazione finale.

### Decisioni di release

- Scope mantenuto a due casi d'uso core end-to-end.
- Rimosso il precedente RNF-02 sul limite di 1,5 secondi perché non accompagnato da condizioni nominali e ambiente di misura riproducibili.
- Il controllo trasversale tramite pattern XSS/SQL injection è adottato come difesa aggiuntiva e non sostituisce validazione specifica, query parametrizzate ed escaping contestuale.
- Nessun pattern GoF introdotto artificialmente: le dipendenze infrastrutturali sono isolate tramite porte applicative dove esiste una reale esigenza di sostituibilità e testabilità.
