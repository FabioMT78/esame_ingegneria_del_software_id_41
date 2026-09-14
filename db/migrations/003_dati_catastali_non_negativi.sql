BEGIN;

ALTER TABLE dati_catastali
    ADD CONSTRAINT ck_dati_catastali_foglio_non_negativo
        CHECK (foglio >= 0),
    ADD CONSTRAINT ck_dati_catastali_particella_non_negativa
        CHECK (particella >= 0),
    ADD CONSTRAINT ck_dati_catastali_subalterno_non_negativo
        CHECK (subalterno >= 0),
    ADD CONSTRAINT ck_dati_catastali_consistenza_non_negativa
        CHECK (consistenza >= 0),
    ADD CONSTRAINT ck_dati_catastali_rendita_non_negativa
        CHECK (rendita >= 0);

COMMIT;
