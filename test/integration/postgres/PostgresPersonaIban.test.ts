import PostgresPersonaRepository from "../../../src/infrastructure/persistence/postgres/PostgresPersonaRepository";
import PostgresRegistrazioneContratto from "../../../src/infrastructure/persistence/postgres/PostgresRegistrazioneContratto";
import PostgresTestDatabase from "../../support/PostgresTestDatabase";
import {
  creaContrattoNuovo,
  creaTipologiaPersistita,
} from "../../support/PostgresRegistrazioneContrattoFixture";

jest.setTimeout(15_000);

describe("PostgreSQL - IBAN Persona", () => {
  let database: PostgresTestDatabase;

  beforeAll(async () => {
    database = await PostgresTestDatabase.crea();
  });

  beforeEach(async () => {
    await database.reset();
  });

  afterAll(async () => {
    await database.chiudi();
  });

  test("persiste e ricostruisce l'IBAN del proprietario nella registrazione definitiva", async () => {
    const tipologia = await creaTipologiaPersistita(database.client);
    const contratto = creaContrattoNuovo(tipologia);
    contratto.proprietario.iban = "IT60X0542811101000000123456";

    const registrazione = new PostgresRegistrazioneContratto(database.client);
    await registrazione.registraDefinitivamente(contratto);

    const repository = new PostgresPersonaRepository(database.client);
    const proprietario = await repository.trovaPerCodiceFiscale(
      contratto.proprietario.codiceFiscale,
    );

    expect(proprietario?.iban).toBe("IT60X0542811101000000123456");
  });
});
