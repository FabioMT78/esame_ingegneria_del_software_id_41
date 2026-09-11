class Contratto {
  constructor({ dal, tipologia }) {
    this.dal = new Date(dal.getTime());
    this.tipologia = tipologia;
  }

  get al() {
    const anniversario = new Date(this.dal.getTime());

    anniversario.setUTCFullYear(
      anniversario.getUTCFullYear() + this.tipologia.durata
    );

    anniversario.setUTCDate(anniversario.getUTCDate() - 1);

    return anniversario;
  }

  siSovrapponeA(altro) {
    return this.dal <= altro.al && altro.dal <= this.al;
  }
}

module.exports = Contratto;
