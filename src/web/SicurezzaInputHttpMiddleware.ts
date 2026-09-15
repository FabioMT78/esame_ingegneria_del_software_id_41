import type { NextFunction, Request, Response } from "express";
import { ErroreValidazione } from "../application/errors/ApplicationError";
import {
  ErroreInputSospetto,
  SicurezzaInputService,
} from "./SicurezzaInputService";

const sicurezzaInputService = new SicurezzaInputService();

function decodificaPercorso(percorso: string): string {
  try {
    return decodeURIComponent(percorso);
  } catch {
    return percorso;
  }
}

function sicurezzaInputHttpMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    sicurezzaInputService.verifica(
      decodificaPercorso(req.path),
      "path",
    );

    sicurezzaInputService.verifica(req.query, "query");
    sicurezzaInputService.verifica(req.body, "body");

    next();
  } catch (errore) {
    if (errore instanceof ErroreInputSospetto) {
      const { rilevazione } = errore;

      console.warn("[SECURITY] Input sospetto rifiutato", {
        metodo: req.method,
        confine: req.baseUrl || "/api",
        origine: rilevazione.percorso,
        categoria: rilevazione.categoria,
        pattern: rilevazione.patternId,
        valore: rilevazione.valorePerLog,
      });

      next(new ErroreValidazione("Input HTTP non ammesso"));
      return;
    }

    next(errore);
  }
}

export { sicurezzaInputHttpMiddleware };
