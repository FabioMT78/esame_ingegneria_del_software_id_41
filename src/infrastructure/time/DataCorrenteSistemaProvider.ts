import type DataCorrenteProvider from "../../application/ports/DataCorrenteProvider";

type OrologioSistema = () => Date;

class DataCorrenteSistemaProvider implements DataCorrenteProvider {
  constructor(
    private readonly oraCorrente: OrologioSistema = () => new Date(),
  ) {}

  oggi(): Date {
    const adesso = this.oraCorrente();

    return new Date(
      Date.UTC(
        adesso.getFullYear(),
        adesso.getMonth(),
        adesso.getDate(),
      ),
    );
  }
}

export = DataCorrenteSistemaProvider;
