import RegistraPagamentoService from "../../src/application/RegistraPagamentoService";
import {
  ConflittoApplicativo,
  RisorsaNonTrovata,
} from "../../src/application/errors/ApplicationError";
import type ContrattoRepository from "../../src/application/ports/ContrattoRepository";
import type DataCorrenteProvider from "../../src/application/ports/DataCorrenteProvider";
import type ImmobileRepository from "../../src/application/ports/ImmobileRepository";
import type PagamentoRepository from "../../src/application/ports/PagamentoRepository";
import Articolo from "../../src/domain/Articolo";
import Contratto from "../../src/domain/Contratto";
import DatiCatastali from "../../src/domain/DatiCatastali";
import Immobile from "../../src/domain/Immobile";
import Indirizzo from "../../src/domain/Indirizzo";
import Pagamento from "../../src/domain/Pagamento";
import Persona from "../../src/domain/Persona";
import TipologiaContrattuale from "../../src/domain/TipologiaContrattuale";

class ImmobileRepositoryFake implements ImmobileRepository {
  immobili: Immobile[] = [];

  async trovaTutti(): Promise<Immobile[]> {
    return [...this.immobili];
  }

  async trovaPerId(id: number): Promise<Immobile | null> {
    return this.immobili.find((immobile) => immobile.id === id) ?? null;
  }

  async trovaPerDatiCatastali(): Promise<Immobile | null> {
    return null;
  }

  async esisteConIndirizzo(): Promise<boolean> {
    return false;
  }
}

class ContrattoRepositoryFake implements ContrattoRepository {
  contratti: Contratto[] = [];

  async trovaPerId(id: number): Promise<Contratto | null> {
    return this.contratti.find((contratto) => contratto.id === id) ?? null;
  }

  async trovaPerImmobile(immobileId: number): Promise<Contratto[]> {
    return this.contratti.filter(
      (contratto) => contratto.immobile.id === immobileId,
    );
  }

  async esisteSovrapposizione(): Promise<boolean> {
    return false;
  }
}

class PagamentoRepositoryFake implements PagamentoRepository {
  salvataggi: { contrattoId: number; pagamento: Pagamento }[] = [];
  erroreDaLanciare: Error | null = null;

  async salva(contrattoId: number, pagamento: Pagamento): Promise<void> {
    if (this.erroreDaLanciare !== null) {
      throw this.erroreDaLanciare;
    }

    this.salvataggi.push({ contrattoId, pagamento });
  }
}

class DataCorrenteProviderFake implements DataCorrenteProvider {
  constructor(private readonly data: Date) {}

  oggi(): Date {
    return new Date(this.data.getTime());
  }
}

const tipologia = new TipologiaContrattuale({
  id: 1,
  denominazione: "Canone concordato",
  durata: 3,
  rinnovo: 2,
  articoli: [
    new Articolo({
      id: 1,
      numArticolo: 1,
      numParte: 0,
      titolo: "Articolo test",
      descrizione: "Testo",
    }),
  ],
});

const proprietario = creaPersona(1, "RSSMRA80A01H501U", "Mario", "Rossi");
const inquilino = creaPersona(2, "VRDLGI80A01H501X", "Luigi", "Verdi");
const altroInquilino = creaPersona(
  3,
  "BNCLCU80A01H501Y",
  "Luca",
  "Bianchi",
);

function creaPersona(
  id: number,
  codiceFiscale: string,
  nome: string,
  cognome: string,
): Persona {
  return new Persona({
    id,
    nome,
    cognome,
    luogoNascita: "Roma",
    dataNascita: new Date("1980-01-01T00:00:00.000Z"),
    codiceFiscale,
    residenza: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: "Via Esempio",
      civico: "1",
    }),
  });
}

function creaImmobile(id: number, nome = "Casa"): Immobile {
  return new Immobile({
    id,
    nome,
    indirizzo: new Indirizzo({
      provincia: "RM",
      comune: "Roma",
      indirizzo: `Via Immobile ${id}`,
      civico: "1",
    }),
    datiCatastali: new DatiCatastali({
      codiceComunale: "H501",
      foglio: 1,
      particella: id,
      subalterno: 1,
      categoria: "A/2",
      consistenza: 5,
      rendita: 700,
    }),
  });
}

type CreaContrattoOptions = {
  id?: number;
  immobile?: Immobile;
  tenant?: Persona;
  dal?: Date;
  al?: Date;
  canoneMensile?: number;
  giornoPagamento?: number;
};

function creaContratto({
  id = 10,
  immobile = creaImmobile(1),
  tenant = inquilino,
  dal = new Date("2026-06-15T00:00:00.000Z"),
  al = new Date("2029-06-14T00:00:00.000Z"),
  canoneMensile = 1000,
  giornoPagamento = 15,
}: CreaContrattoOptions = {}): Contratto {
  return new Contratto({
    id,
    nomeDescrizione: `Contratto ${id}`,
    immobile,
    proprietario,
    inquilino: tenant,
    tipologia,
    dal,
    al,
    canoneMensile,
    giornoPagamento,
    registratoIl: new Date("2026-06-01T00:00:00.000Z"),
  });
}

function aggiungiPagamento(
  contratto: Contratto,
  annoCompetenza: number,
  meseCompetenza: number,
): void {
  contratto.aggiungiPagamento(
    new Pagamento({
      annoCompetenza,
      meseCompetenza,
      dataPagamento: new Date("2026-06-01T00:00:00.000Z"),
      importo: contratto.calcolaImportoCompetenza(
        annoCompetenza,
        meseCompetenza,
      ),
    }),
  );
}

function creaService(
  oggi = new Date("2026-09-10T00:00:00.000Z"),
): {
  service: RegistraPagamentoService;
  immobili: ImmobileRepositoryFake;
  contratti: ContrattoRepositoryFake;
  pagamenti: PagamentoRepositoryFake;
} {
  const immobili = new ImmobileRepositoryFake();
  const contratti = new ContrattoRepositoryFake();
  const pagamenti = new PagamentoRepositoryFake();
  const service = new RegistraPagamentoService(
    immobili,
    contratti,
    pagamenti,
    new DataCorrenteProviderFake(oggi),
  );

  return { service, immobili, contratti, pagamenti };
}

describe("RegistraPagamentoService", () => {
  test("elenca gli immobili mantenendo distinti quelli con lo stesso nome", async () => {
    const { service, immobili } = creaService();
    immobili.immobili = [creaImmobile(1, "Casa"), creaImmobile(2, "Casa")];

    const risultato = await service.elencaImmobili();

    expect(risultato).toHaveLength(2);
    expect(risultato.map((immobile) => immobile.id)).toEqual([1, 2]);
  });

  test("elenca una sola volta gli inquilini associati ai contratti dell'immobile", async () => {
    const { service, contratti } = creaService();
    const immobile = creaImmobile(1);
    contratti.contratti = [
      creaContratto({ id: 10, immobile, tenant: inquilino }),
      creaContratto({
        id: 11,
        immobile,
        tenant: inquilino,
        dal: new Date("2030-01-01T00:00:00.000Z"),
        al: new Date("2032-12-31T00:00:00.000Z"),
      }),
      creaContratto({ id: 12, immobile, tenant: altroInquilino }),
      creaContratto({ id: 13, immobile: creaImmobile(2), tenant: altroInquilino }),
    ];

    const risultato = await service.elencaInquilini(1);

    expect(risultato.map((persona) => persona.id)).toEqual([2, 3]);
  });

  test("se il primo pagamento creato con il contratto esiste propone la competenza successiva", async () => {
    const { service, contratti } = creaService();
    const contratto = creaContratto();
    aggiungiPagamento(contratto, 2026, 6);
    contratti.contratti = [contratto];

    const anteprima = await service.preparaPagamento(1, 2);

    expect(anteprima).not.toBeNull();
    expect(anteprima).toMatchObject({
      contrattoId: 10,
      annoCompetenza: 2026,
      meseCompetenza: 7,
      importo: 1000,
      canoneMensile: 1000,
      tipologiaDenominazione: "Canone concordato",
    });
  });

  test("salta le competenze già pagate e propone la più vecchia rimasta", async () => {
    const { service, contratti } = creaService();
    const contratto = creaContratto();
    aggiungiPagamento(contratto, 2026, 6);
    aggiungiPagamento(contratto, 2026, 7);
    contratti.contratti = [contratto];

    const anteprima = await service.preparaPagamento(1, 2);

    expect(anteprima).toMatchObject({
      annoCompetenza: 2026,
      meseCompetenza: 8,
    });
  });

  test("tra più contratti dello stesso inquilino sceglie la competenza non pagata cronologicamente più vecchia", async () => {
    const { service, contratti } = creaService(
      new Date("2026-09-20T00:00:00.000Z"),
    );
    const immobile = creaImmobile(1);
    const contrattoStorico = creaContratto({
      id: 10,
      immobile,
      dal: new Date("2026-01-01T00:00:00.000Z"),
      al: new Date("2026-04-30T00:00:00.000Z"),
    });
    const contrattoCorrente = creaContratto({
      id: 11,
      immobile,
      dal: new Date("2026-06-01T00:00:00.000Z"),
      al: new Date("2029-05-31T00:00:00.000Z"),
    });
    aggiungiPagamento(contrattoStorico, 2026, 1);
    aggiungiPagamento(contrattoStorico, 2026, 2);
    aggiungiPagamento(contrattoCorrente, 2026, 6);
    contratti.contratti = [contrattoCorrente, contrattoStorico];

    const anteprima = await service.preparaPagamento(1, 2);

    expect(anteprima).toMatchObject({
      contrattoId: 10,
      annoCompetenza: 2026,
      meseCompetenza: 3,
    });
  });

  test("non propone mesi futuri", async () => {
    const { service, contratti } = creaService();
    const contratto = creaContratto();
    for (const mese of [6, 7, 8, 9]) {
      aggiungiPagamento(contratto, 2026, mese);
    }
    contratti.contratti = [contratto];

    const anteprima = await service.preparaPagamento(1, 2);

    expect(anteprima).toBeNull();
  });

  test("propone il mese corrente anche prima del giorno di pagamento", async () => {
    const { service, contratti } = creaService(
      new Date("2026-09-10T00:00:00.000Z"),
    );
    const contratto = creaContratto({ giornoPagamento: 15 });
    for (const mese of [6, 7, 8]) {
      aggiungiPagamento(contratto, 2026, mese);
    }
    contratti.contratti = [contratto];

    const anteprima = await service.preparaPagamento(1, 2);

    expect(anteprima).toMatchObject({
      annoCompetenza: 2026,
      meseCompetenza: 9,
      dovuta: false,
      tardivo: false,
    });
    expect(anteprima?.scadenza).toEqual(
      new Date("2026-09-15T00:00:00.000Z"),
    );
  });

  test.each<[string, string, boolean, boolean]>([
    ["nel giorno di pagamento", "2026-09-15T00:00:00.000Z", true, false],
    ["dopo il giorno di pagamento", "2026-09-16T00:00:00.000Z", true, true],
  ])(
    "classifica la competenza come dovuta %s",
    async (_descrizione, dataCorrente, dovuta, tardivo) => {
      const { service, contratti } = creaService(new Date(dataCorrente));
      const contratto = creaContratto({ giornoPagamento: 15 });
      for (const mese of [6, 7, 8]) {
        aggiungiPagamento(contratto, 2026, mese);
      }
      contratti.contratti = [contratto];

      const anteprima = await service.preparaPagamento(1, 2);

      expect(anteprima).toMatchObject({
        annoCompetenza: 2026,
        meseCompetenza: 9,
        dovuta,
        tardivo,
      });
    },
  );

  test("restituisce null quando non esistono competenze registrabili", async () => {
    const { service, contratti } = creaService();
    const contratto = creaContratto({
      dal: new Date("2026-06-01T00:00:00.000Z"),
    });
    for (const mese of [6, 7, 8, 9]) {
      aggiungiPagamento(contratto, 2026, mese);
    }
    contratti.contratti = [contratto];

    await expect(service.preparaPagamento(1, 2)).resolves.toBeNull();
  });

  test("usa il calcolo pro-rata del contratto per una competenza parziale", async () => {
    const { service, contratti } = creaService();
    const contratto = creaContratto({
      dal: new Date("2026-06-15T00:00:00.000Z"),
      canoneMensile: 1000,
    });
    contratti.contratti = [contratto];

    const anteprima = await service.preparaPagamento(1, 2);

    expect(anteprima).toMatchObject({
      annoCompetenza: 2026,
      meseCompetenza: 6,
      importo: 533.33,
    });
  });

  test("alla conferma ricarica lo stato, crea il pagamento con la data server e lo persiste", async () => {
    const oggi = new Date("2026-09-10T13:45:00.000Z");
    const { service, contratti, pagamenti } = creaService(oggi);
    const contratto = creaContratto();
    aggiungiPagamento(contratto, 2026, 6);
    contratti.contratti = [contratto];

    const pagamento = await service.confermaPagamento(10, 2026, 7);

    expect(pagamento).toMatchObject({
      annoCompetenza: 2026,
      meseCompetenza: 7,
      importo: 1000,
    });
    expect(pagamento.dataPagamento).toEqual(
      new Date("2026-09-10T00:00:00.000Z"),
    );
    expect(pagamenti.salvataggi).toHaveLength(1);
    expect(pagamenti.salvataggi[0]).toMatchObject({
      contrattoId: 10,
      pagamento,
    });
  });

  test("rifiuta la conferma se la competenza mostrata in anteprima è stata nel frattempo pagata", async () => {
    const { service, contratti, pagamenti } = creaService();
    const contratto = creaContratto();
    aggiungiPagamento(contratto, 2026, 6);
    contratti.contratti = [contratto];

    const anteprima = await service.preparaPagamento(1, 2);
    expect(anteprima).toMatchObject({
      contrattoId: 10,
      annoCompetenza: 2026,
      meseCompetenza: 7,
    });

    aggiungiPagamento(contratto, 2026, 7);

    await expect(
      service.confermaPagamento(10, 2026, 7),
    ).rejects.toBeInstanceOf(ConflittoApplicativo);
    expect(pagamenti.salvataggi).toHaveLength(0);
  });

  test("rifiuta il salto di una competenza precedente ancora non pagata", async () => {
    const { service, contratti, pagamenti } = creaService();
    const contratto = creaContratto();
    aggiungiPagamento(contratto, 2026, 6);
    contratti.contratti = [contratto];

    await expect(
      service.confermaPagamento(10, 2026, 8),
    ).rejects.toBeInstanceOf(ConflittoApplicativo);
    expect(pagamenti.salvataggi).toHaveLength(0);
  });

  test("alla conferma considera anche eventuali arretrati più vecchi di altri contratti dello stesso inquilino", async () => {
    const { service, contratti, pagamenti } = creaService();
    const immobile = creaImmobile(1);
    const storico = creaContratto({
      id: 10,
      immobile,
      dal: new Date("2026-01-01T00:00:00.000Z"),
      al: new Date("2026-04-30T00:00:00.000Z"),
    });
    const corrente = creaContratto({
      id: 11,
      immobile,
      dal: new Date("2026-06-01T00:00:00.000Z"),
      al: new Date("2029-05-31T00:00:00.000Z"),
    });
    aggiungiPagamento(storico, 2026, 1);
    aggiungiPagamento(storico, 2026, 2);
    aggiungiPagamento(corrente, 2026, 6);
    contratti.contratti = [corrente, storico];

    await expect(
      service.confermaPagamento(11, 2026, 7),
    ).rejects.toBeInstanceOf(ConflittoApplicativo);
    expect(pagamenti.salvataggi).toHaveLength(0);
  });

  test("ricalcola l'importo alla conferma senza fidarsi del valore della preview", async () => {
    const { service, contratti } = creaService();
    const contratto = creaContratto({
      dal: new Date("2026-06-15T00:00:00.000Z"),
      canoneMensile: 1000,
    });
    contratti.contratti = [contratto];

    const anteprima = await service.preparaPagamento(1, 2);
    expect(anteprima?.importo).toBe(533.33);

    contratto.canoneMensile = 1200;

    const pagamento = await service.confermaPagamento(10, 2026, 6);

    expect(pagamento.importo).toBe(640);
  });

  test("propaga un errore di persistenza senza restituire un falso successo", async () => {
    const { service, contratti, pagamenti } = creaService();
    const contratto = creaContratto();
    aggiungiPagamento(contratto, 2026, 6);
    contratti.contratti = [contratto];
    const errore = new Error("Persistenza non disponibile");
    pagamenti.erroreDaLanciare = errore;

    await expect(
      service.confermaPagamento(10, 2026, 7),
    ).rejects.toBe(errore);
    expect(pagamenti.salvataggi).toHaveLength(0);
  });

  test("se il contratto non esiste segnala una risorsa non trovata", async () => {
    const { service } = creaService();

    await expect(
      service.confermaPagamento(999, 2026, 7),
    ).rejects.toBeInstanceOf(RisorsaNonTrovata);
  });
});
