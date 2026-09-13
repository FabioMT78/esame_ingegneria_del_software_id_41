import {
  caricaBozze,
  caricaImmobili,
  cercaPersona,
  salvaImmobileEsistente,
  salvaInquilino,
  salvaNuovoImmobile,
  salvaProprietario,
} from "./api.js";
import { creaGestorePersona } from "./personaForm.js";

const stato = {
  bozze: [],
  immobili: [],
  bozzaCorrente: null,
  occupato: false,
  stepVisualizzato: 1,
};

const elementi = {};
let proprietarioForm;
let inquilinoForm;

function richiesto(id) {
  const elemento = document.getElementById(id);

  if (elemento === null) {
    throw new Error(`Elemento DOM non trovato: ${id}`);
  }

  return elemento;
}

function inizializzaElementi() {
  elementi.stepper = richiesto("stepper");
  elementi.status = richiesto("status");
  elementi.avvioPanel = richiesto("avvio-panel");
  elementi.bozzeList = richiesto("bozze-list");
  elementi.nuovoContratto = richiesto("nuovo-contratto");
  elementi.step1Panel = richiesto("step1-panel");
  elementi.step2Panel = richiesto("step2-panel");
  elementi.step3Panel = richiesto("step3-panel");
  elementi.formEsistente = richiesto("form-immobile-esistente");
  elementi.formNuovo = richiesto("form-immobile-nuovo");
  elementi.immobileId = richiesto("immobile-id");
  elementi.immobileDetail = richiesto("immobile-detail");
}

function mostraStato(messaggio, tipo) {
  elementi.status.textContent = messaggio;
  elementi.status.className = `status ${tipo}`;
  elementi.status.hidden = false;
}

function nascondiStato() {
  elementi.status.hidden = true;
  elementi.status.textContent = "";
  elementi.status.className = "status";
}

function impostaOccupato(occupato, messaggio = "Operazione in corso…") {
  stato.occupato = occupato;

  document.querySelectorAll("button, input, select").forEach((elemento) => {
    elemento.disabled = occupato;
  });

  if (occupato) {
    mostraStato(messaggio, "loading");
  }
}

function idBozzaCorrente() {
  const idBozza = stato.bozzaCorrente?.idBozza;

  if (!Number.isInteger(idBozza) || idBozza < 1) {
    throw new Error("La bozza corrente non ha un identificatore valido");
  }

  return idBozza;
}

function descrizioneImmobile(immobile) {
  const dati = immobile.datiCatastali;
  const indirizzo = immobile.indirizzo;

  return [
    `${indirizzo.indirizzo}${indirizzo.civico ? ` ${indirizzo.civico}` : ""}`,
    `${indirizzo.comune} (${indirizzo.provincia})`,
    `Catasto ${dati.codiceComunale}, foglio ${dati.foglio}, particella ${dati.particella}, sub ${dati.subalterno}`,
  ].join(" — ");
}

function descrizioneBozza(bozza) {
  if (bozza.immobile === null) {
    return "Immobile non ancora definito";
  }

  return `${bozza.immobile.nome} — ${descrizioneImmobile(bozza.immobile)}`;
}

function aggiornaStepper() {
  const completati = stato.bozzaCorrente?.stepCompletato ?? 0;

  elementi.stepper.querySelectorAll("[data-step]").forEach((voce) => {
    const numero = Number(voce.dataset.step);
    voce.classList.toggle("completed", numero <= completati);
    voce.classList.toggle("active", numero === stato.stepVisualizzato);
  });
}

function aggiornaBadge() {
  [1, 2, 3].forEach((step) => {
    const badge = richiesto(`bozza-badge-step${step}`);
    const idBozza = stato.bozzaCorrente?.idBozza;

    if (Number.isInteger(idBozza)) {
      badge.hidden = false;
      badge.textContent = `Bozza #${idBozza}`;
    } else {
      badge.hidden = true;
      badge.textContent = "";
    }
  });
}

function nascondiPannelli() {
  elementi.avvioPanel.hidden = true;
  elementi.step1Panel.hidden = true;
  elementi.step2Panel.hidden = true;
  elementi.step3Panel.hidden = true;
}

function renderBozze() {
  elementi.bozzeList.replaceChildren();

  stato.bozze.forEach((bozza) => {
    const contenitore = document.createElement("article");
    contenitore.className = "draft";

    const testo = document.createElement("div");
    const titolo = document.createElement("strong");
    titolo.textContent = `Bozza #${bozza.idBozza}`;
    const step = document.createElement("p");
    step.textContent = `Step completato: ${bozza.stepCompletato} di 6`;
    const dettaglio = document.createElement("p");
    dettaglio.className = "muted";
    dettaglio.textContent = descrizioneBozza(bozza);

    testo.append(titolo, step, dettaglio);

    const azione = document.createElement("button");
    azione.type = "button";
    azione.className = "button secondary";
    azione.textContent = "Riprendi";
    azione.addEventListener("click", () => {
      selezionaBozza(bozza);
    });

    contenitore.append(testo, azione);
    elementi.bozzeList.append(contenitore);
  });
}

function renderImmobili() {
  elementi.immobileId.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleziona un immobile";
  elementi.immobileId.append(placeholder);

  stato.immobili.forEach((immobile) => {
    const option = document.createElement("option");
    option.value = String(immobile.id);
    option.textContent =
      `${immobile.nome} — ${immobile.indirizzo.comune} — ` +
      `foglio ${immobile.datiCatastali.foglio}, ` +
      `particella ${immobile.datiCatastali.particella}, ` +
      `sub ${immobile.datiCatastali.subalterno}`;
    elementi.immobileId.append(option);
  });
}

function svuotaFormNuovo() {
  elementi.formNuovo.reset();
}

function assegnaValore(id, valore) {
  const elemento = richiesto(id);
  elemento.value = valore ?? "";
}

function compilaFormNuovo(immobile) {
  assegnaValore("nome", immobile.nome);
  assegnaValore("nazione", immobile.indirizzo.nazione);
  assegnaValore("provincia", immobile.indirizzo.provincia);
  assegnaValore("comune", immobile.indirizzo.comune);
  assegnaValore("cap", immobile.indirizzo.cap);
  assegnaValore("indirizzo", immobile.indirizzo.indirizzo);
  assegnaValore("civico", immobile.indirizzo.civico);
  assegnaValore("scala", immobile.indirizzo.scala);
  assegnaValore("interno", immobile.indirizzo.interno);
  assegnaValore("codice-comunale", immobile.datiCatastali.codiceComunale);
  assegnaValore("foglio", immobile.datiCatastali.foglio);
  assegnaValore("particella", immobile.datiCatastali.particella);
  assegnaValore("subalterno", immobile.datiCatastali.subalterno);
  assegnaValore("categoria", immobile.datiCatastali.categoria);
  assegnaValore("consistenza", immobile.datiCatastali.consistenza);
  assegnaValore("rendita", immobile.datiCatastali.rendita);
}

function impostaModalita(modalita) {
  const radio = document.querySelector(
    `input[name="modalita-immobile"][value="${modalita}"]`,
  );

  if (radio !== null) {
    radio.checked = true;
  }

  const esistente = modalita === "esistente";
  elementi.formEsistente.hidden = !esistente;
  elementi.formNuovo.hidden = esistente;
}

function aggiornaDettaglioImmobile() {
  const id = Number(elementi.immobileId.value);
  const immobile = stato.immobili.find((item) => item.id === id);
  elementi.immobileDetail.textContent =
    immobile === undefined ? "" : descrizioneImmobile(immobile);
}

function preparaStep1() {
  const immobile = stato.bozzaCorrente?.immobile ?? null;

  if (immobile === null) {
    elementi.immobileId.value = "";
    elementi.immobileDetail.textContent = "";
    svuotaFormNuovo();
    impostaModalita("esistente");
  } else if (immobile.id !== null) {
    elementi.immobileId.value = String(immobile.id);
    aggiornaDettaglioImmobile();
    impostaModalita("esistente");
  } else {
    svuotaFormNuovo();
    compilaFormNuovo(immobile);
    impostaModalita("nuovo");
  }
}

function mostraStep(step) {
  nascondiPannelli();
  stato.stepVisualizzato = step;
  aggiornaBadge();

  if (step === 1) {
    preparaStep1();
    elementi.step1Panel.hidden = false;
  } else if (step === 2) {
    proprietarioForm.caricaDaBozza(stato.bozzaCorrente?.proprietario);
    elementi.step2Panel.hidden = false;
  } else {
    inquilinoForm.caricaDaBozza(stato.bozzaCorrente?.inquilino);
    elementi.step3Panel.hidden = false;
  }

  aggiornaStepper();
}

function selezionaBozza(bozza) {
  stato.bozzaCorrente = bozza;
  nascondiStato();

  if (bozza.stepCompletato < 1) {
    mostraStep(1);
  } else if (bozza.stepCompletato === 1) {
    mostraStep(2);
  } else {
    mostraStep(3);
  }
}

function nuovaProcedura() {
  stato.bozzaCorrente = null;
  elementi.immobileId.value = "";
  elementi.immobileDetail.textContent = "";
  svuotaFormNuovo();
  nascondiStato();
  mostraStep(1);
}

function leggiTestoForm(formData, campo) {
  const valore = formData.get(campo);
  return typeof valore === "string" ? valore.trim() : "";
}

function campoOpzionale(formData, campo) {
  const valore = leggiTestoForm(formData, campo);
  return valore === "" ? undefined : valore;
}

function numeroForm(formData, campo) {
  return Number(leggiTestoForm(formData, campo));
}

function creaNuovoImmobileDaForm() {
  const dati = new FormData(elementi.formNuovo);

  return {
    nome: leggiTestoForm(dati, "nome"),
    indirizzo: {
      ...(campoOpzionale(dati, "nazione") === undefined
        ? {}
        : { nazione: campoOpzionale(dati, "nazione") }),
      provincia: leggiTestoForm(dati, "provincia"),
      comune: leggiTestoForm(dati, "comune"),
      ...(campoOpzionale(dati, "cap") === undefined
        ? {}
        : { cap: campoOpzionale(dati, "cap") }),
      indirizzo: leggiTestoForm(dati, "indirizzo"),
      ...(campoOpzionale(dati, "civico") === undefined
        ? {}
        : { civico: campoOpzionale(dati, "civico") }),
      ...(campoOpzionale(dati, "scala") === undefined
        ? {}
        : { scala: campoOpzionale(dati, "scala") }),
      ...(campoOpzionale(dati, "interno") === undefined
        ? {}
        : { interno: campoOpzionale(dati, "interno") }),
    },
    datiCatastali: {
      codiceComunale: leggiTestoForm(dati, "codiceComunale"),
      foglio: numeroForm(dati, "foglio"),
      particella: numeroForm(dati, "particella"),
      subalterno: numeroForm(dati, "subalterno"),
      categoria: leggiTestoForm(dati, "categoria"),
      consistenza: numeroForm(dati, "consistenza"),
      rendita: numeroForm(dati, "rendita"),
    },
  };
}

async function salvaEsistente(evento) {
  evento.preventDefault();

  if (!elementi.formEsistente.reportValidity()) {
    return;
  }

  const immobileId = Number(elementi.immobileId.value);
  const idBozza = stato.bozzaCorrente?.idBozza ?? null;

  try {
    impostaOccupato(true, "Salvataggio dell'immobile in corso…");
    const bozza = await salvaImmobileEsistente(immobileId, idBozza);
    stato.bozzaCorrente = bozza;
    mostraStep(2);
    mostraStato(
      `Step 1 salvato nella bozza #${bozza.idBozza}.`,
      "success",
    );
  } catch (errore) {
    mostraStato(
      errore instanceof Error ? errore.message : "Errore durante il salvataggio",
      "error",
    );
  } finally {
    impostaOccupato(false);
  }
}

async function salvaNuovo(evento) {
  evento.preventDefault();

  if (!elementi.formNuovo.reportValidity()) {
    return;
  }

  const immobile = creaNuovoImmobileDaForm();
  const idBozza = stato.bozzaCorrente?.idBozza ?? null;

  try {
    impostaOccupato(true, "Validazione e salvataggio dell'immobile in corso…");
    const bozza = await salvaNuovoImmobile(immobile, idBozza);
    stato.bozzaCorrente = bozza;
    mostraStep(2);
    mostraStato(
      `Step 1 salvato nella bozza #${bozza.idBozza}.`,
      "success",
    );
  } catch (errore) {
    mostraStato(
      errore instanceof Error ? errore.message : "Errore durante il salvataggio",
      "error",
    );
  } finally {
    impostaOccupato(false);
  }
}

async function cercaPersonaConFeedback(codiceFiscale, ruolo) {
  const descrizione =
    ruolo === "proprietario" ? "del proprietario" : "dell'inquilino";

  try {
    impostaOccupato(true, `Ricerca ${descrizione} in corso…`);
    const persona = await cercaPersona(
      idBozzaCorrente(),
      ruolo,
      codiceFiscale,
    );
    nascondiStato();
    return persona;
  } catch (errore) {
    mostraStato(
      errore instanceof Error ? errore.message : "Errore durante la ricerca",
      "error",
    );
    throw errore;
  } finally {
    impostaOccupato(false);
  }
}

async function salvaProprietarioCorrente(persona) {
  try {
    impostaOccupato(true, "Salvataggio del proprietario in corso…");
    const bozza = await salvaProprietario(idBozzaCorrente(), persona);
    stato.bozzaCorrente = bozza;
    mostraStep(3);
    mostraStato(
      `Step 2 salvato nella bozza #${bozza.idBozza}.`,
      "success",
    );
  } catch (errore) {
    mostraStato(
      errore instanceof Error ? errore.message : "Errore durante il salvataggio",
      "error",
    );
    throw errore;
  } finally {
    impostaOccupato(false);
  }
}

async function salvaInquilinoCorrente(persona) {
  try {
    impostaOccupato(true, "Salvataggio dell'inquilino in corso…");
    const bozza = await salvaInquilino(idBozzaCorrente(), persona);
    stato.bozzaCorrente = bozza;
    mostraStep(3);
    mostraStato(
      `Step 3 salvato nella bozza #${bozza.idBozza}. I dati di proprietario e inquilino sono completi.`,
      "success",
    );
  } catch (errore) {
    mostraStato(
      errore instanceof Error ? errore.message : "Errore durante il salvataggio",
      "error",
    );
    throw errore;
  } finally {
    impostaOccupato(false);
  }
}

function inizializzaFormPersone() {
  proprietarioForm = creaGestorePersona({
    prefix: "proprietario",
    richiedeDocumento: false,
    onCerca: (codiceFiscale) =>
      cercaPersonaConFeedback(codiceFiscale, "proprietario"),
    onSalva: salvaProprietarioCorrente,
    onIndietro: () => {
      nascondiStato();
      mostraStep(1);
    },
  });

  inquilinoForm = creaGestorePersona({
    prefix: "inquilino",
    richiedeDocumento: true,
    onCerca: (codiceFiscale) =>
      cercaPersonaConFeedback(codiceFiscale, "inquilino"),
    onSalva: salvaInquilinoCorrente,
    onIndietro: () => {
      nascondiStato();
      mostraStep(2);
    },
  });
}

function registraEventi() {
  elementi.nuovoContratto.addEventListener("click", nuovaProcedura);

  document
    .querySelectorAll('input[name="modalita-immobile"]')
    .forEach((radio) => {
      radio.addEventListener("change", (evento) => {
        const target = evento.currentTarget;

        if (target instanceof HTMLInputElement) {
          impostaModalita(target.value);
        }
      });
    });

  elementi.immobileId.addEventListener("change", aggiornaDettaglioImmobile);
  elementi.formEsistente.addEventListener("submit", salvaEsistente);
  elementi.formNuovo.addEventListener("submit", salvaNuovo);
}

async function avvia() {
  inizializzaElementi();
  inizializzaFormPersone();
  registraEventi();
  aggiornaStepper();

  try {
    impostaOccupato(true, "Recupero delle bozze e degli immobili…");
    const [bozze, immobili] = await Promise.all([
      caricaBozze(),
      caricaImmobili(),
    ]);

    stato.bozze = bozze;
    stato.immobili = immobili;
    renderImmobili();

    if (bozze.length > 0) {
      renderBozze();
      nascondiPannelli();
      elementi.avvioPanel.hidden = false;
      mostraStato(
        `${bozze.length} ${bozze.length === 1 ? "bozza recuperabile" : "bozze recuperabili"}.`,
        "success",
      );
    } else {
      nuovaProcedura();
    }
  } catch (errore) {
    nascondiPannelli();
    mostraStato(
      errore instanceof Error
        ? errore.message
        : "Impossibile avviare la registrazione del contratto",
      "error",
    );
  } finally {
    impostaOccupato(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void avvia();
});
