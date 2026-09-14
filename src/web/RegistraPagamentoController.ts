import { Router } from "express";
import type RegistraPagamentoService from "../application/RegistraPagamentoService";
import {
  leggiConfermaPagamento,
  leggiIdParametroUc02,
  leggiSelezioneAnteprima,
} from "./Uc02HttpInput";
import {
  serializzaAnteprimaPagamento,
  serializzaImmobilePagamento,
  serializzaInquilinoPagamento,
  serializzaPagamento,
} from "./Uc02HttpOutput";

type RegistraPagamentoHttpService = Pick<
  RegistraPagamentoService,
  | "elencaImmobili"
  | "elencaInquilini"
  | "preparaPagamento"
  | "confermaPagamento"
>;

class RegistraPagamentoController {
  readonly router: Router;

  constructor(private readonly service: RegistraPagamentoHttpService) {
    this.router = Router();
    this.registraRoute();
  }

  private registraRoute(): void {
    this.router.get("/pagamenti/immobili", async (_req, res) => {
      const immobili = await this.service.elencaImmobili();

      res.status(200).json(immobili.map(serializzaImmobilePagamento));
    });

    this.router.get(
      "/pagamenti/immobili/:immobileId/inquilini",
      async (req, res) => {
        const immobileId = leggiIdParametroUc02(
          req.params.immobileId,
          "immobileId",
        );
        const inquilini = await this.service.elencaInquilini(immobileId);

        res.status(200).json(inquilini.map(serializzaInquilinoPagamento));
      },
    );

    this.router.get("/pagamenti/anteprima", async (req, res) => {
      const { immobileId, inquilinoId } = leggiSelezioneAnteprima(
        req.query.immobileId,
        req.query.inquilinoId,
      );
      const anteprima = await this.service.preparaPagamento(
        immobileId,
        inquilinoId,
      );

      res
        .status(200)
        .json(
          anteprima === null
            ? null
            : serializzaAnteprimaPagamento(anteprima),
        );
    });

    this.router.post("/pagamenti/conferma", async (req, res) => {
      const { contrattoId, annoCompetenza, meseCompetenza } =
        leggiConfermaPagamento(req.body);
      const pagamento = await this.service.confermaPagamento(
        contrattoId,
        annoCompetenza,
        meseCompetenza,
      );

      res.status(201).json(serializzaPagamento(pagamento));
    });
  }
}

export { RegistraPagamentoController };
export type { RegistraPagamentoHttpService };
