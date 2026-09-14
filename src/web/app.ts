import express, { type Express } from "express";
import {
  RegistraContrattoController,
  type RegistraContrattoHttpService,
} from "./RegistraContrattoController";
import {
  RegistraPagamentoController,
  type RegistraPagamentoHttpService,
} from "./RegistraPagamentoController";
import { gestisciErroreHttp } from "./HttpErrorHandler";

type CreaAppOptions = {
  registraContrattoService?: RegistraContrattoHttpService;
  registraPagamentoService?: RegistraPagamentoHttpService;
};

function creaApp(options: CreaAppOptions = {}): Express {
  const app = express();

  app.use(express.json());
  app.use(express.static("public"));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  if (options.registraContrattoService !== undefined) {
    const controller = new RegistraContrattoController(
      options.registraContrattoService,
    );
    app.use("/api", controller.router);
  }

  if (options.registraPagamentoService !== undefined) {
    const controller = new RegistraPagamentoController(
      options.registraPagamentoService,
    );
    app.use("/api", controller.router);
  }

  app.use(gestisciErroreHttp);

  return app;
}

export { creaApp };
export type { CreaAppOptions };
