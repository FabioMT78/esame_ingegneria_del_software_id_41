import { Router } from "express";
import type RegistraContrattoService from "../application/RegistraContrattoService";
import {
  leggiDatiContrattuali,
  leggiIdParametro,
  leggiNuovoImmobile,
  leggiPersonaDaBody,
  leggiSelezioneImmobile,
  leggiStringaParametro,
} from "./Uc01HttpInput";
import {
  serializzaBozza,
  serializzaImmobile,
  serializzaPersona,
  serializzaTipologia,
} from "./Uc01HttpOutput";

type RegistraContrattoHttpService = Pick<
  RegistraContrattoService,
  | "avvia"
  | "elencaImmobili"
  | "elencaTipologie"
  | "selezionaImmobile"
  | "inserisciNuovoImmobile"
  | "cercaPersona"
  | "impostaProprietario"
  | "impostaInquilino"
  | "impostaDatiContrattuali"
  | "conferma"
  | "annulla"
>;

class RegistraContrattoController {
  readonly router: Router;

  constructor(private readonly service: RegistraContrattoHttpService) {
    this.router = Router();
    this.registraRoute();
  }

  private registraRoute(): void {
    this.router.get("/contratti/bozze", async (_req, res) => {
      const bozze = await this.service.avvia();
      res.status(200).json(bozze.map(serializzaBozza));
    });

    this.router.get("/immobili", async (_req, res) => {
      const immobili = await this.service.elencaImmobili();
      res.status(200).json(immobili.map(serializzaImmobile));
    });

    this.router.get("/tipologie-contrattuali", async (_req, res) => {
      const tipologie = await this.service.elencaTipologie();
      res.status(200).json(tipologie.map(serializzaTipologia));
    });

    this.router.get("/persone/:codiceFiscale", async (req, res) => {
      const codiceFiscale = leggiStringaParametro(
        req.params.codiceFiscale,
        "codiceFiscale",
      );
      const persona = await this.service.cercaPersona(codiceFiscale);
      res.status(200).json(persona === null ? null : serializzaPersona(persona));
    });

    this.router.post(
      "/contratti/bozze/immobile-esistente",
      async (req, res) => {
        const { immobileId, idBozza } = leggiSelezioneImmobile(req.body);
        const bozza = await this.service.selezionaImmobile(
          immobileId,
          idBozza,
        );
        res.status(200).json(serializzaBozza(bozza));
      },
    );

    this.router.post(
      "/contratti/bozze/immobile-nuovo",
      async (req, res) => {
        const { immobile, idBozza } = leggiNuovoImmobile(req.body);
        const bozza = await this.service.inserisciNuovoImmobile(
          immobile,
          idBozza,
        );
        res.status(200).json(serializzaBozza(bozza));
      },
    );

    this.router.put(
      "/contratti/bozze/:idBozza/proprietario",
      async (req, res) => {
        const idBozza = leggiIdParametro(req.params.idBozza, "idBozza");
        const persona = leggiPersonaDaBody(req.body);
        const bozza = await this.service.impostaProprietario(
          idBozza,
          persona,
        );
        res.status(200).json(serializzaBozza(bozza));
      },
    );

    this.router.put(
      "/contratti/bozze/:idBozza/inquilino",
      async (req, res) => {
        const idBozza = leggiIdParametro(req.params.idBozza, "idBozza");
        const persona = leggiPersonaDaBody(req.body);
        const bozza = await this.service.impostaInquilino(idBozza, persona);
        res.status(200).json(serializzaBozza(bozza));
      },
    );

    this.router.put(
      "/contratti/bozze/:idBozza/dati-contrattuali",
      async (req, res) => {
        const idBozza = leggiIdParametro(req.params.idBozza, "idBozza");
        const dati = leggiDatiContrattuali(req.body);
        const bozza = await this.service.impostaDatiContrattuali(
          idBozza,
          dati.nomeDescrizione,
          dati.tipologiaId,
          dati.dal,
          dati.canoneMensile,
          dati.giornoPagamento,
        );
        res.status(200).json(serializzaBozza(bozza));
      },
    );

    this.router.post(
      "/contratti/bozze/:idBozza/conferma",
      async (req, res) => {
        const idBozza = leggiIdParametro(req.params.idBozza, "idBozza");
        await this.service.conferma(idBozza);
        res.status(204).send();
      },
    );

    this.router.delete(
      "/contratti/bozze/:idBozza",
      async (req, res) => {
        const idBozza = leggiIdParametro(req.params.idBozza, "idBozza");
        await this.service.annulla(idBozza);
        res.status(204).send();
      },
    );
  }
}

export { RegistraContrattoController };
export type { RegistraContrattoHttpService };
