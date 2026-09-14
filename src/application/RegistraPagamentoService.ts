import type Contratto from "../domain/Contratto";
import type Immobile from "../domain/Immobile";
import type Persona from "../domain/Persona";
import PagamentoDaRegistrare from "./model/PagamentoDaRegistrare";
import type ContrattoRepository from "./ports/ContrattoRepository";
import type DataCorrenteProvider from "./ports/DataCorrenteProvider";
import type ImmobileRepository from "./ports/ImmobileRepository";

type CompetenzaNonPagata = {
  contratto: Contratto;
  anno: number;
  mese: number;
};

class RegistraPagamentoService {
  constructor(
    private readonly immobileRepository: ImmobileRepository,
    private readonly contrattoRepository: ContrattoRepository,
    private readonly dataCorrenteProvider: DataCorrenteProvider,
  ) {}

  async elencaImmobili(): Promise<Immobile[]> {
    return this.immobileRepository.trovaTutti();
  }

  async elencaInquilini(immobileId: number): Promise<Persona[]> {
    const contratti = await this.contrattoRepository.trovaPerImmobile(
      immobileId,
    );
    const inquiliniUnici = new Map<string, Persona>();

    for (const contratto of contratti) {
      const inquilino = contratto.inquilino;
      const chiave = inquilino.id !== undefined
        ? `id:${inquilino.id}`
        : `cf:${inquilino.codiceFiscale}`;

      if (!inquiliniUnici.has(chiave)) {
        inquiliniUnici.set(chiave, inquilino);
      }
    }

    return [...inquiliniUnici.values()];
  }

  async preparaPagamento(
    immobileId: number,
    inquilinoId: number,
  ): Promise<PagamentoDaRegistrare | null> {
    const contratti = await this.contrattoRepository.trovaPerImmobile(
      immobileId,
    );
    const contrattiDellInquilino = contratti.filter(
      (contratto) => contratto.inquilino.id === inquilinoId,
    );
    const oggi = this.dataCorrenteProvider.oggi();
    const competenza = this.trovaCompetenzaNonPagataPiuVecchia(
      contrattiDellInquilino,
      oggi,
    );

    if (competenza === null) {
      return null;
    }

    return this.creaAnteprima(competenza, oggi);
  }

  private trovaCompetenzaNonPagataPiuVecchia(
    contratti: Contratto[],
    oggi: Date,
  ): CompetenzaNonPagata | null {
    let piuVecchia: CompetenzaNonPagata | null = null;

    for (const contratto of contratti) {
      const competenza = this.trovaPrimaCompetenzaNonPagata(contratto, oggi);

      if (
        competenza !== null &&
        (
          piuVecchia === null ||
          RegistraPagamentoService.chiaveCompetenza(
            competenza.anno,
            competenza.mese,
          ) < RegistraPagamentoService.chiaveCompetenza(
            piuVecchia.anno,
            piuVecchia.mese,
          )
        )
      ) {
        piuVecchia = competenza;
      }
    }

    return piuVecchia;
  }

  private trovaPrimaCompetenzaNonPagata(
    contratto: Contratto,
    oggi: Date,
  ): CompetenzaNonPagata | null {
    const primoMese = RegistraPagamentoService.inizioMese(contratto.dal);
    const ultimoMeseContratto = RegistraPagamentoService.inizioMese(
      contratto.al,
    );
    const meseCorrente = RegistraPagamentoService.inizioMese(oggi);
    const ultimoMeseAmmesso = ultimoMeseContratto < meseCorrente
      ? ultimoMeseContratto
      : meseCorrente;

    if (primoMese > ultimoMeseAmmesso) {
      return null;
    }

    const cursore = new Date(primoMese.getTime());

    while (cursore <= ultimoMeseAmmesso) {
      const anno = cursore.getUTCFullYear();
      const mese = cursore.getUTCMonth() + 1;
      const giaPagata = contratto.pagamenti.some(
        (pagamento) =>
          pagamento.annoCompetenza === anno &&
          pagamento.meseCompetenza === mese,
      );

      if (!giaPagata) {
        return { contratto, anno, mese };
      }

      cursore.setUTCMonth(cursore.getUTCMonth() + 1);
    }

    return null;
  }

  private creaAnteprima(
    competenza: CompetenzaNonPagata,
    oggi: Date,
  ): PagamentoDaRegistrare {
    const { contratto, anno, mese } = competenza;

    if (contratto.id === undefined) {
      throw new Error("Contratto registrato privo di identificativo");
    }

    const scadenza = contratto.calcolaScadenzaCompetenza(anno, mese);
    const oggiNormalizzato = RegistraPagamentoService.inizioGiorno(oggi);

    return new PagamentoDaRegistrare({
      contrattoId: contratto.id,
      canoneMensile: contratto.canoneMensile,
      tipologiaDenominazione: contratto.tipologia.denominazione,
      dal: contratto.dal,
      al: contratto.al,
      annoCompetenza: anno,
      meseCompetenza: mese,
      scadenza,
      importo: contratto.calcolaImportoCompetenza(anno, mese),
      dovuta: oggiNormalizzato >= scadenza,
      tardivo: oggiNormalizzato > scadenza,
    });
  }

  private static inizioMese(data: Date): Date {
    return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
  }

  private static inizioGiorno(data: Date): Date {
    return new Date(
      Date.UTC(
        data.getUTCFullYear(),
        data.getUTCMonth(),
        data.getUTCDate(),
      ),
    );
  }

  private static chiaveCompetenza(anno: number, mese: number): number {
    return anno * 12 + mese;
  }
}

export = RegistraPagamentoService;
