class ErroreValidazione extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroreValidazione";
  }
}

class RisorsaNonTrovata extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RisorsaNonTrovata";
  }
}

class ConflittoApplicativo extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflittoApplicativo";
  }
}

export { ConflittoApplicativo, ErroreValidazione, RisorsaNonTrovata };
