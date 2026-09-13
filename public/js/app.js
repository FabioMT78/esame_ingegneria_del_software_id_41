import {
  caricaBozze,
  caricaImmobili,
  salvaImmobileEsistente,
  salvaNuovoImmobile,
} from "./api.js";

const stato = {
  bozze: [],
  immobili: [],
  bozzaCorrente: null,
  occupato: false,
};

const elementi = {};

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
  elementi.bozzaBadge = richiesto("bozza-badge");
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
  const prossimo = Math.min(completati + 1, 6);

  elementi.stepper.querySelectorAll("[data-step]").forEach((voce) => {
    const numero = Number(voce.dataset.step);
    voce.classList.toggle("completed", numero <= completati);
    voce.classList.toggle("active", numero === prossimo);
  });

  if (completati === 0) {
    const primo = elementi.stepper.querySelector('[data-step="1"]');
    primo?.classList.add("active");
  }
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
    option.textContent = `${immobile.nome} — ${immobile.indirizzo.comune} — foglio ${immobile.datiCatastali.foglio}, particella ${immobile.datiCatastali.particella}, sub ${immobile.datiCatastali.subalterno}`;
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

  if (stato.bozzaCorrente?.idBozza !== undefined) {
    elementi.bozzaBadge.hidden = false;
    elementi.bozzaBadge.textContent = `Bozza #${stato.bozzaCorrente.idBozza}`;
  } else {
    elementi.bozzaBadge.hidden = true;
    elementi.bozzaBadge.textContent = "";
  }

  if (immobile === null) {
    elementi.immobileId.value = "";
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

  aggiornaStepper();
}

function mostraStep1() {
  elementi.avvioPanel.hidden = true;
  elementi.step1Panel.hidden = false;
  preparaStep1();
}

function selezionaBozza(bozza) {
  stato.bozzaCorrente = bozza;
  nascondiStato();
  mostraStep1();
}

function nuovaProcedura() {
  stato.bozzaCorrente = null;
  elementi.immobileId.value = "";
  elementi.immobileDetail.textContent = "";
  svuotaFormNuovo();
  nascondiStato();
  mostraStep1();
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
    preparaStep1();
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
    preparaStep1();
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
      elementi.avvioPanel.hidden = false;
      elementi.step1Panel.hidden = true;
      mostraStato(
        `${bozze.length} ${bozze.length === 1 ? "bozza recuperabile" : "bozze recuperabili"}.`,
        "success",
      );
    } else {
      nuovaProcedura();
    }
  } catch (errore) {
    elementi.avvioPanel.hidden = true;
    elementi.step1Panel.hidden = true;
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
