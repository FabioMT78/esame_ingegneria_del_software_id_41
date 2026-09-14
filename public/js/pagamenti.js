"use strict";

const stato = document.getElementById("pagamento-status");
const immobileSelect = document.getElementById("pagamento-immobile");
const inquilinoPanel = document.getElementById("inquilino-panel");
const inquilinoSelect = document.getElementById("pagamento-inquilino");
const inquilinoHelp = document.getElementById("inquilino-help");
const anteprimaPanel = document.getElementById("anteprima-panel");
const nessunaMensilita = document.getElementById("nessuna-mensilita");
const anteprimaContenuto = document.getElementById("anteprima-contenuto");
const confermaPanel = document.getElementById("conferma-panel");
const pagamentoPagato = document.getElementById("pagamento-pagato");
const pagamentoAnnulla = document.getElementById("pagamento-annulla");
const confermaIndietro = document.getElementById("conferma-indietro");
const confermaPagamento = document.getElementById("conferma-pagamento");
const pagamentoSuccesso = document.getElementById("pagamento-successo");
const successoDettaglio = document.getElementById("successo-dettaglio");
const nuovoPagamento = document.getElementById("nuovo-pagamento");

const previewTipologia = document.getElementById("preview-tipologia");
const previewPeriodo = document.getElementById("preview-periodo");
const previewCanone = document.getElementById("preview-canone");
const previewCompetenza = document.getElementById("preview-competenza");
const previewScadenza = document.getElementById("preview-scadenza");
const previewImporto = document.getElementById("preview-importo");
const previewStato = document.getElementById("preview-stato");

let anteprimaCorrente = null;

function mostraStato(messaggio, tipo = "") {
  stato.textContent = messaggio;
  stato.className = `status ${tipo}`.trim();
  stato.hidden = false;
}

function nascondiStato() {
  stato.hidden = true;
  stato.textContent = "";
  stato.className = "status";
}

async function richiestaJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const messaggio =
      body !== null && typeof body.errore === "string"
        ? body.errore
        : `Richiesta non riuscita (${response.status})`;
    throw new Error(messaggio);
  }

  return body;
}

function formattaImporto(importo) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(importo);
}

function formattaData(data) {
  const parti = data.split("-");

  if (parti.length !== 3) {
    return data;
  }

  return `${parti[2]}/${parti[1]}/${parti[0]}`;
}

function nomeMese(mese) {
  return new Intl.DateTimeFormat("it-IT", { month: "long" }).format(
    new Date(Date.UTC(2020, mese - 1, 1)),
  );
}

function resetAnteprima() {
  anteprimaCorrente = null;
  anteprimaPanel.hidden = true;
  nessunaMensilita.hidden = true;
  anteprimaContenuto.hidden = true;
  confermaPanel.hidden = true;
}

function resetProcedura() {
  nascondiStato();
  resetAnteprima();
  pagamentoSuccesso.hidden = true;
  immobileSelect.value = "";
  inquilinoSelect.innerHTML =
    '<option value="">Seleziona un inquilino</option>';
  inquilinoPanel.hidden = true;
}

function descrizioneImmobile(immobile) {
  const civico =
    immobile.indirizzo.civico === null
      ? ""
      : ` ${immobile.indirizzo.civico}`;

  return `[ID ${immobile.id}] ${immobile.nome} — ` +
    `${immobile.indirizzo.comune}, ${immobile.indirizzo.indirizzo}${civico}`;
}

function descrizioneInquilino(inquilino) {
  return `${inquilino.cognome} ${inquilino.nome} — ${inquilino.codiceFiscale}`;
}

async function caricaImmobili() {
  mostraStato("Caricamento immobili...", "loading");

  try {
    const immobili = await richiestaJson("/api/pagamenti/immobili");

    immobileSelect.innerHTML =
      '<option value="">Seleziona un immobile</option>';

    for (const immobile of immobili) {
      const option = document.createElement("option");
      option.value = String(immobile.id);
      option.textContent = descrizioneImmobile(immobile);
      immobileSelect.append(option);
    }

    if (immobili.length === 0) {
      mostraStato(
        "Non risultano immobili associati a contratti registrati.",
      );
      return;
    }

    nascondiStato();
  } catch (errore) {
    mostraStato(errore.message, "error");
  }
}

async function caricaInquilini() {
  resetAnteprima();
  pagamentoSuccesso.hidden = true;
  inquilinoSelect.innerHTML =
    '<option value="">Seleziona un inquilino</option>';

  if (immobileSelect.value === "") {
    inquilinoPanel.hidden = true;
    return;
  }

  inquilinoPanel.hidden = false;
  mostraStato("Caricamento inquilini...", "loading");

  try {
    const inquilini = await richiestaJson(
      `/api/pagamenti/immobili/${immobileSelect.value}/inquilini`,
    );

    for (const inquilino of inquilini) {
      const option = document.createElement("option");
      option.value = String(inquilino.id);
      option.textContent = descrizioneInquilino(inquilino);
      inquilinoSelect.append(option);
    }

    if (inquilini.length === 0) {
      inquilinoHelp.textContent =
        "Non risultano inquilini associati a contratti dell'immobile.";
      nascondiStato();
      return;
    }

    inquilinoHelp.textContent =
      inquilini.length === 1
        ? "È presente un solo inquilino: selezione automatica."
        : "Seleziona l'inquilino per cui registrare il pagamento.";

    nascondiStato();

    if (inquilini.length === 1) {
      inquilinoSelect.value = String(inquilini[0].id);
      await caricaAnteprima();
    }
  } catch (errore) {
    mostraStato(errore.message, "error");
  }
}

function mostraAnteprima(anteprima) {
  anteprimaCorrente = anteprima;
  anteprimaPanel.hidden = false;
  nessunaMensilita.hidden = true;
  anteprimaContenuto.hidden = false;
  confermaPanel.hidden = true;

  previewTipologia.textContent = anteprima.tipologiaDenominazione;
  previewPeriodo.textContent =
    `${formattaData(anteprima.dal)} — ${formattaData(anteprima.al)}`;
  previewCanone.textContent = formattaImporto(anteprima.canoneMensile);
  previewCompetenza.textContent =
    `${nomeMese(anteprima.meseCompetenza)} ${anteprima.annoCompetenza}`;
  previewScadenza.textContent = formattaData(anteprima.scadenza);
  previewImporto.textContent = formattaImporto(anteprima.importo);

  if (anteprima.tardivo) {
    previewStato.textContent = "Pagamento tardivo";
  } else if (anteprima.dovuta) {
    previewStato.textContent = "Pagamento dovuto";
  } else {
    previewStato.textContent = "Pagabile, non ancora dovuto";
  }
}

async function caricaAnteprima() {
  resetAnteprima();

  if (immobileSelect.value === "" || inquilinoSelect.value === "") {
    return;
  }

  mostraStato("Calcolo della mensilità da registrare...", "loading");

  const parametri = new URLSearchParams({
    immobileId: immobileSelect.value,
    inquilinoId: inquilinoSelect.value,
  });

  try {
    const anteprima = await richiestaJson(
      `/api/pagamenti/anteprima?${parametri.toString()}`,
    );

    anteprimaPanel.hidden = false;
    nascondiStato();

    if (anteprima === null) {
      nessunaMensilita.hidden = false;
      anteprimaContenuto.hidden = true;
      return;
    }

    mostraAnteprima(anteprima);
  } catch (errore) {
    mostraStato(errore.message, "error");
  }
}

async function registraPagamento() {
  if (anteprimaCorrente === null) {
    return;
  }

  confermaPagamento.disabled = true;
  mostraStato(
    "Rivalidazione dei dati e registrazione del pagamento...",
    "loading",
  );

  try {
    const pagamento = await richiestaJson("/api/pagamenti/conferma", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contrattoId: anteprimaCorrente.contrattoId,
        annoCompetenza: anteprimaCorrente.annoCompetenza,
        meseCompetenza: anteprimaCorrente.meseCompetenza,
      }),
    });

    nascondiStato();
    anteprimaPanel.hidden = true;
    inquilinoPanel.hidden = true;
    pagamentoSuccesso.hidden = false;
    successoDettaglio.textContent =
      `Registrato ${nomeMese(pagamento.meseCompetenza)} ` +
      `${pagamento.annoCompetenza} in data ` +
      `${formattaData(pagamento.dataPagamento)} per ` +
      `${formattaImporto(pagamento.importo)}.`;
    anteprimaCorrente = null;
  } catch (errore) {
    confermaPanel.hidden = true;
    mostraStato(
      `${errore.message}. Ricarica l'anteprima prima di riprovare.`,
      "error",
    );
  } finally {
    confermaPagamento.disabled = false;
  }
}

immobileSelect.addEventListener("change", () => {
  void caricaInquilini();
});

inquilinoSelect.addEventListener("change", () => {
  void caricaAnteprima();
});

pagamentoPagato.addEventListener("click", () => {
  confermaPanel.hidden = false;
});

pagamentoAnnulla.addEventListener("click", () => {
  resetProcedura();
});

confermaIndietro.addEventListener("click", () => {
  confermaPanel.hidden = true;
});

confermaPagamento.addEventListener("click", () => {
  void registraPagamento();
});

nuovoPagamento.addEventListener("click", () => {
  resetProcedura();
});

void caricaImmobili();
