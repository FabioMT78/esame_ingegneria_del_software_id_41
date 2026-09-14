import type { NextFunction, Request, Response } from "express";
import {
  ConflittoApplicativo,
  ErroreValidazione,
  RisorsaNonTrovata,
} from "../application/errors/ApplicationError";

function gestisciErroreHttp(
  errore: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (errore instanceof ErroreValidazione || errore instanceof RangeError) {
    console.warn(`[HTTP 400] ${errore.message}`);
    res.status(400).json({ errore: errore.message });
    return;
  }

  if (errore instanceof RisorsaNonTrovata) {
    console.warn(`[HTTP 404] ${errore.message}`);
    res.status(404).json({ errore: errore.message });
    return;
  }

  if (errore instanceof ConflittoApplicativo) {
    console.warn(`[HTTP 409] ${errore.message}`);
    res.status(409).json({ errore: errore.message });
    return;
  }

  if (errore instanceof SyntaxError) {
    console.warn("[HTTP 400] Corpo JSON non valido");
    res.status(400).json({ errore: "Corpo JSON non valido" });
    return;
  }

  console.error("[HTTP 500] Errore non gestito", errore);
  res.status(500).json({ errore: "Errore interno del server" });
}

export { gestisciErroreHttp };
