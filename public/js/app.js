import {
  annullaBozza,
  caricaBozze,
  caricaImmobili,
  caricaTipologie,
  cercaPersona,
  confermaContratto,
  salvaDatiContrattuali,
  salvaImmobileEsistente,
  salvaInquilino,
  salvaNuovoImmobile,
  salvaProprietario,
} from "./api.js";
import { creaGestorePersona } from "./personaForm.js";

const stato = {
  bozze: [],
  immobili: [],
  tipologie: [],
  bozzaCorrente: null,
  occupato: false,
  stepVisualizzato: 1,
  ritornoAlRiepilogo: false,
  proceduraConclusa: false,
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
  elementi.proceduraToolbar = richiesto("procedura-toolbar");
  elementi.tornaRiepilogo = richiesto("torna-riepilogo");
  elementi.annullaBozza = richiesto("annulla-bozza");
  elementi.avvioPanel = richiesto("avvio-panel");
  elementi.bozzeList = richiesto("bozze-list");
  elementi.nuovoContratto = richiesto("nuovo-contratto");

  elementi.step1Panel = richiesto("step1-panel");
  elementi.step2Panel = richiesto("step2-panel");
  elementi.step3Panel = richiesto("step3-panel");
  elementi.step4Panel = richiesto("step4-panel");
  elementi.step5Panel = richiesto("step5-panel");
  elementi.step6Panel = richiesto("step6-panel");

  elementi.formEsistente = richiesto("form-immobile-esistente");
  elementi.formNuovo = richiesto("form-immobile-nuovo");
  elementi.immobileId = richiesto("immobile-id");
  elementi.immobileDetail = richiesto("immobile-detail");

  elementi.formDatiContrattuali = richiesto("form-dati-contrattuali");
  elementi.contrattoNome = richiesto("contratto-nome-descrizione");
  elementi.contrattoTipologia = richiesto("contratto-tipologia");
  elementi.tipologiaDettaglio = richiesto("tipologia-dettaglio");
  elementi.contrattoDal = richiesto("contratto-dal");
  elementi.contrattoAl = richiesto("contratto-al");
  elementi.contrattoCanone = richiesto("contratto-canone");
  elementi.contrattoGiornoPagamento = richiesto(
    "contratto-giorno-pagamento",
  );
  elementi.tipologiaArticoli = richiesto("tipologia-articoli");
  elementi.tipologiaArticoliList = richiesto("tipologia-articoli-list");
  elementi.datiContrattualiIndietro = richiesto(
    "dati-contrattuali-indietro",
  );

  elementi.riepilogoContenuto = richiesto("riepilogo-contenuto");
  elementi.riepilogoIndietro = richiesto("riepilogo-indietro");
  elementi.vaiConferma = richiesto("vai-conferma");

  elementi.confermaContent = richiesto("conferma-content");
  elementi.confermaDettaglio = richiesto("conferma-dettaglio");
  elementi.confermaIndietro = richiesto("conferma-indietro");
  elementi.confermaContratto = richiesto("conferma-contratto");
  elementi.confermaSuccesso = richiesto("conferma-successo");
  elementi.confermaSuccessoTesto = richiesto("conferma-successo-testo");
  elementi.nuovaProceduraDopoConferma = richiesto(
    "nuova-procedura-dopo-conferma",
  );
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

function formattaIndirizzo(indirizzo) {
  const primaRiga = [
    indirizzo.indirizzo,
    indirizzo.civico,
    indirizzo.scala ? `scala ${indirizzo.scala}` : null,
    indirizzo.interno ? `interno ${indirizzo.interno}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const secondaRiga = [
    indirizzo.cap,
    indirizzo.comune,
    indirizzo.provincia ? `(${indirizzo.provincia})` : null,
    indirizzo.nazione,
  ]
    .filter(Boolean)
    .join(" ");

  return [primaRiga, secondaRiga].filter(Boolean).join(" — ");
}

function formattaEuro(valore) {
  if (typeof valore !== "number" || !Number.isFinite(valore)) {
    return "—";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(valore);
}

function aggiornaStepper() {
  const completati = stato.proceduraConclusa
    ? 6
    : (stato.bozzaCorrente?.stepCompletato ?? 0);

  elementi.stepper.querySelectorAll("[data-step]").forEach((voce) => {
    const numero = Number(voce.dataset.step);
    voce.classList.toggle("completed", numero <= completati);
    voce.classList.toggle("active", numero === stato.stepVisualizzato);
  });
}

function aggiornaBadge() {
  [1, 2, 3, 4, 5, 6].forEach((step) => {
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

function aggiornaAzioniProcedura() {
  const haBozza =
    Number.isInteger(stato.bozzaCorrente?.idBozza) &&
    !stato.proceduraConclusa;

  elementi.proceduraToolbar.hidden = !haBozza;
  elementi.tornaRiepilogo.hidden =
    !haBozza ||
    !stato.ritornoAlRiepilogo ||
    stato.stepVisualizzato < 1 ||
    stato.stepVisualizzato > 4;
}

function nascondiPannelli() {
  elementi.avvioPanel.hidden = true;
  elementi.step1Panel.hidden = true;
  elementi.step2Panel.hidden = true;
  elementi.step3Panel.hidden = true;
  elementi.step4Panel.hidden = true;
  elementi.step5Panel.hidden = true;
  elementi.step6Panel.hidden = true;
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

function tipologieDisponibili() {
  const tipologie = [...stato.tipologie];
  const corrente = stato.bozzaCorrente?.tipologia;

  if (
    corrente !== null &&
    corrente !== undefined &&
    Number.isInteger(corrente.id) &&
    !tipologie.some((tipologia) => tipologia.id === corrente.id)
  ) {
    tipologie.push(corrente);
  }

  return tipologie;
}

function renderTipologie() {
  const valoreCorrente = elementi.contrattoTipologia.value;
  elementi.contrattoTipologia.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent =
    tipologieDisponibili().length === 0
      ? "Nessuna tipologia disponibile"
      : "Seleziona una tipologia";
  elementi.contrattoTipologia.append(placeholder);

  tipologieDisponibili().forEach((tipologia) => {
    const option = document.createElement("option");
    option.value = String(tipologia.id);
    option.textContent =
      `${tipologia.denominazione} — ${tipologia.durata}+${tipologia.rinnovo}`;
    elementi.contrattoTipologia.append(option);
  });

  elementi.contrattoTipologia.value = valoreCorrente;
}

function tipologiaSelezionata() {
  const id = Number(elementi.contrattoTipologia.value);

  return (
    tipologieDisponibili().find((tipologia) => tipologia.id === id) ?? null
  );
}

function renderArticoliTipologia(tipologia) {
  elementi.tipologiaArticoliList.replaceChildren();

  if (tipologia === null || tipologia.articoli.length === 0) {
    elementi.tipologiaArticoli.hidden = true;
    return;
  }

  const gruppi = new Map();

  [...tipologia.articoli]
    .sort(
      (a, b) =>
        a.numArticolo - b.numArticolo ||
        a.numParte - b.numParte,
    )
    .forEach((articolo) => {
      const chiave = String(articolo.numArticolo);
      const esistenti = gruppi.get(chiave) ?? [];
      esistenti.push(articolo);
      gruppi.set(chiave, esistenti);
    });

  gruppi.forEach((parti, numero) => {
    const articolo = document.createElement("article");
    articolo.className = "template-article";

    const titolo = document.createElement("h4");
    titolo.textContent = `Articolo ${numero} — ${parti[0].titolo}`;
    articolo.append(titolo);

    if (parti[0].sottotitolo) {
      const sottotitolo = document.createElement("p");
      sottotitolo.className = "muted";
      sottotitolo.textContent = parti[0].sottotitolo;
      articolo.append(sottotitolo);
    }

    parti.forEach((parte) => {
      const testo = document.createElement("p");
      testo.className = "template-text";
      testo.textContent = parte.descrizione;
      articolo.append(testo);
    });

    elementi.tipologiaArticoliList.append(articolo);
  });

  elementi.tipologiaArticoli.hidden = false;
}

function tipologiaRichiedeIbanProprietario(tipologia) {
  return tipologia.articoli.some((articolo) =>
    /\{\{\s*proprietario\.iban\s*\}\}/.test(articolo.descrizione),
  );
}

function aggiornaDettaglioTipologia() {
  const tipologia = tipologiaSelezionata();

  if (tipologia === null) {
    elementi.tipologiaDettaglio.textContent =
      tipologieDisponibili().length === 0
        ? "Le tipologie devono essere presenti nel database prima di completare lo step."
        : "";
    renderArticoliTipologia(null);
    return;
  }

  const richiedeIban = tipologiaRichiedeIbanProprietario(tipologia);
  const ibanMancante =
    richiedeIban && !stato.bozzaCorrente?.proprietario?.iban;

  elementi.tipologiaDettaglio.textContent =
    `Periodo iniziale: ${tipologia.durata} anni. ` +
    `Rinnovo previsto dalla tipologia: ${tipologia.rinnovo} anni.` +
    (ibanMancante
      ? " Il template selezionato richiede l'IBAN del proprietario: torna allo Step 2 per inserirlo."
      : "");

  renderArticoliTipologia(tipologia);
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

function preparaStep4() {
  const bozza = stato.bozzaCorrente;

  elementi.contrattoNome.value = bozza?.nomeDescrizione ?? "";
  elementi.contrattoDal.value = bozza?.dal ?? "";
  elementi.contrattoAl.value = bozza?.al ?? "";
  elementi.contrattoCanone.value = bozza?.canoneMensile ?? "";
  elementi.contrattoGiornoPagamento.value =
    bozza?.giornoPagamento ?? "";

  renderTipologie();

  if (bozza?.tipologia?.id !== null && bozza?.tipologia?.id !== undefined) {
    elementi.contrattoTipologia.value = String(bozza.tipologia.id);
  } else {
    elementi.contrattoTipologia.value = "";
  }

  aggiornaDettaglioTipologia();
}

function creaRigaRiepilogo(etichetta, valore) {
  const dt = document.createElement("dt");
  dt.textContent = etichetta;

  const dd = document.createElement("dd");
  dd.textContent = valore ?? "—";

  return [dt, dd];
}

function creaSezioneRiepilogo(titolo, step, righe) {
  const sezione = document.createElement("section");
  sezione.className = "summary-section";

  const intestazione = document.createElement("div");
  intestazione.className = "summary-heading";

  const h3 = document.createElement("h3");
  h3.textContent = titolo;

  const modifica = document.createElement("button");
  modifica.type = "button";
  modifica.className = "button secondary compact";
  modifica.textContent = "Modifica";
  modifica.addEventListener("click", () => {
    modificaStep(step);
  });

  intestazione.append(h3, modifica);

  const elenco = document.createElement("dl");
  elenco.className = "summary-list";

  righe.forEach(([etichetta, valore]) => {
    elenco.append(...creaRigaRiepilogo(etichetta, valore));
  });

  sezione.append(intestazione, elenco);
  return sezione;
}

function renderRiepilogo() {
  const bozza = stato.bozzaCorrente;

  if (
    bozza?.immobile === null ||
    bozza?.immobile === undefined ||
    bozza.proprietario === null ||
    bozza.proprietario === undefined ||
    bozza.inquilino === null ||
    bozza.inquilino === undefined ||
    bozza.tipologia === null ||
    bozza.tipologia === undefined
  ) {
    throw new Error("La bozza non contiene tutti i dati necessari al riepilogo");
  }

  const immobile = bozza.immobile;
  const proprietario = bozza.proprietario;
  const inquilino = bozza.inquilino;
  const documento = inquilino.documento;
  const tipologia = bozza.tipologia;

  elementi.riepilogoContenuto.replaceChildren(
    creaSezioneRiepilogo("Immobile", 1, [
      ["Nome", immobile.nome],
      ["Indirizzo", formattaIndirizzo(immobile.indirizzo)],
      [
        "Dati catastali",
        `${immobile.datiCatastali.codiceComunale} — foglio ${immobile.datiCatastali.foglio}, ` +
          `particella ${immobile.datiCatastali.particella}, sub ${immobile.datiCatastali.subalterno}`,
      ],
      ["Categoria", immobile.datiCatastali.categoria],
      ["Rendita", formattaEuro(immobile.datiCatastali.rendita)],
    ]),
    creaSezioneRiepilogo("Proprietario", 2, [
      ["Nome", `${proprietario.nome} ${proprietario.cognome}`],
      ["Codice fiscale", proprietario.codiceFiscale],
      ["Nascita", `${proprietario.luogoNascita} — ${proprietario.dataNascita}`],
      ["Residenza", formattaIndirizzo(proprietario.residenza)],
      ["IBAN", proprietario.iban ?? "—"],
    ]),
    creaSezioneRiepilogo("Inquilino", 3, [
      ["Nome", `${inquilino.nome} ${inquilino.cognome}`],
      ["Codice fiscale", inquilino.codiceFiscale],
      ["Nascita", `${inquilino.luogoNascita} — ${inquilino.dataNascita}`],
      ["Residenza", formattaIndirizzo(inquilino.residenza)],
      [
        "Documento",
        documento === null || documento === undefined
          ? "—"
          : `${documento.tipo} ${documento.numero} — scadenza ${documento.dataScadenza}`,
      ],
    ]),
    creaSezioneRiepilogo("Dati contrattuali", 4, [
      ["Nome / descrizione", bozza.nomeDescrizione ?? "—"],
      [
        "Tipologia",
        `${tipologia.denominazione} — ${tipologia.durata}+${tipologia.rinnovo}`,
      ],
      ["Periodo", `${bozza.dal ?? "—"} — ${bozza.al ?? "—"}`],
      ["Canone mensile", formattaEuro(bozza.canoneMensile)],
      [
        "Giorno di pagamento",
        bozza.giornoPagamento === null || bozza.giornoPagamento === undefined
          ? "—"
          : String(bozza.giornoPagamento),
      ],
    ]),
  );
}

function renderConferma() {
  const bozza = stato.bozzaCorrente;

  if (bozza === null || bozza === undefined) {
    throw new Error("Bozza non disponibile per la conferma");
  }

  elementi.confermaContent.hidden = false;
  elementi.confermaSuccesso.hidden = true;
  elementi.confermaDettaglio.textContent =
    `${bozza.nomeDescrizione ?? "Contratto"} — ` +
    `${bozza.immobile?.nome ?? "Immobile"} — ` +
    `dal ${bozza.dal ?? "—"} al ${bozza.al ?? "—"} — ` +
    `canone ${formattaEuro(bozza.canoneMensile)}.`;
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
  } else if (step === 3) {
    inquilinoForm.caricaDaBozza(stato.bozzaCorrente?.inquilino);
    elementi.step3Panel.hidden = false;
  } else if (step === 4) {
    preparaStep4();
    elementi.step4Panel.hidden = false;
  } else if (step === 5) {
    renderRiepilogo();
    elementi.step5Panel.hidden = false;
  } else if (step === 6) {
    renderConferma();
    elementi.step6Panel.hidden = false;
  }

  aggiornaStepper();
  aggiornaAzioniProcedura();
}

function determinaStepRipresa(bozza) {
  if (bozza.immobile === null) {
    return 1;
  }

  if (bozza.proprietario === null) {
    return 2;
  }

  if (bozza.inquilino === null) {
    return 3;
  }

  if (
    bozza.tipologia === null ||
    bozza.nomeDescrizione === null ||
    bozza.dal === null ||
    bozza.al === null ||
    bozza.canoneMensile === null ||
    bozza.giornoPagamento === null
  ) {
    return 4;
  }

  return 5;
}

function selezionaBozza(bozza) {
  stato.bozzaCorrente = bozza;
  stato.ritornoAlRiepilogo = false;
  stato.proceduraConclusa = false;
  nascondiStato();
  mostraStep(determinaStepRipresa(bozza));
}

function nuovaProcedura() {
  stato.bozzaCorrente = null;
  stato.ritornoAlRiepilogo = false;
  stato.proceduraConclusa = false;
  elementi.immobileId.value = "";
  elementi.immobileDetail.textContent = "";
  svuotaFormNuovo();
  elementi.formDatiContrattuali.reset();
  elementi.contrattoAl.value = "";
  nascondiStato();
  mostraStep(1);
}

function modificaStep(step) {
  stato.ritornoAlRiepilogo = true;
  nascondiStato();
  mostraStep(step);
}

function tornaAlRiepilogo() {
  stato.ritornoAlRiepilogo = false;
  nascondiStato();
  mostraStep(5);
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

function creaDatiContrattualiDaForm() {
  const dati = new FormData(elementi.formDatiContrattuali);

  return {
    nomeDescrizione: leggiTestoForm(dati, "nomeDescrizione"),
    tipologiaId: numeroForm(dati, "tipologiaId"),
    dal: leggiTestoForm(dati, "dal"),
    canoneMensile: numeroForm(dati, "canoneMensile"),
    giornoPagamento: numeroForm(dati, "giornoPagamento"),
  };
}

function proseguiDopoSalvataggio(stepSuccessivo) {
  if (stato.ritornoAlRiepilogo) {
    stato.ritornoAlRiepilogo = false;
    mostraStep(5);
    return;
  }

  mostraStep(stepSuccessivo);
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
    proseguiDopoSalvataggio(2);
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
    proseguiDopoSalvataggio(2);
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
    proseguiDopoSalvataggio(3);
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
    proseguiDopoSalvataggio(4);
    mostraStato(
      `Step 3 salvato nella bozza #${bozza.idBozza}.`,
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

async function salvaDatiContrattualiCorrenti(evento) {
  evento.preventDefault();

  if (!elementi.formDatiContrattuali.reportValidity()) {
    return;
  }

  try {
    impostaOccupato(true, "Salvataggio dei dati contrattuali in corso…");
    const bozza = await salvaDatiContrattuali(
      idBozzaCorrente(),
      creaDatiContrattualiDaForm(),
    );
    stato.bozzaCorrente = bozza;
    stato.ritornoAlRiepilogo = false;
    mostraStep(5);
    mostraStato(
      `Step 4 salvato. Data finale calcolata dal server: ${bozza.al}.`,
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

async function annullaBozzaCorrente() {
  const idBozza = idBozzaCorrente();

  if (
    !window.confirm(
      "Annullare questa bozza? I dati non ancora registrati definitivamente verranno eliminati.",
    )
  ) {
    return;
  }

  try {
    impostaOccupato(true, "Annullamento della bozza in corso…");
    await annullaBozza(idBozza);

    stato.bozze = stato.bozze.filter(
      (bozza) => bozza.idBozza !== idBozza,
    );
    stato.bozzaCorrente = null;
    stato.ritornoAlRiepilogo = false;
    stato.proceduraConclusa = false;

    if (stato.bozze.length > 0) {
      stato.stepVisualizzato = 1;
      renderBozze();
      nascondiPannelli();
      elementi.avvioPanel.hidden = false;
      mostraStato("Bozza annullata.", "success");
      aggiornaStepper();
      aggiornaAzioniProcedura();
    } else {
      nuovaProcedura();
      mostraStato("Bozza annullata.", "success");
    }
  } catch (errore) {
    mostraStato(
      errore instanceof Error ? errore.message : "Errore durante l'annullamento",
      "error",
    );
  } finally {
    impostaOccupato(false);
  }
}

async function confermaBozzaCorrente() {
  const bozza = stato.bozzaCorrente;
  const idBozza = idBozzaCorrente();

  try {
    impostaOccupato(true, "Registrazione definitiva del contratto in corso…");
    await confermaContratto(idBozza);

    stato.bozze = stato.bozze.filter(
      (bozzaSalvata) => bozzaSalvata.idBozza !== idBozza,
    );
    stato.bozzaCorrente = null;
    stato.ritornoAlRiepilogo = false;
    stato.proceduraConclusa = true;
    stato.stepVisualizzato = 6;

    elementi.confermaContent.hidden = true;
    elementi.confermaSuccesso.hidden = false;
    elementi.confermaSuccessoTesto.textContent =
      `${bozza?.nomeDescrizione ?? "Il contratto"} è stato registrato definitivamente.`;

    aggiornaBadge();
    aggiornaStepper();
    aggiornaAzioniProcedura();
    mostraStato("Registrazione completata con successo.", "success");
  } catch (errore) {
    mostraStato(
      errore instanceof Error
        ? errore.message
        : "Errore durante la registrazione definitiva",
      "error",
    );
  } finally {
    impostaOccupato(false);
  }
}

function inizializzaFormPersone() {
  proprietarioForm = creaGestorePersona({
    prefix: "proprietario",
    richiedeDocumento: false,
    gestisceIban: true,
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
    gestisceIban: false,
    onCerca: (codiceFiscale) =>
      cercaPersonaConFeedback(codiceFiscale, "inquilino"),
    onSalva: salvaInquilinoCorrente,
    onIndietro: () => {
      nascondiStato();
      mostraStep(2);
    },
  });
}

function invalidaDataFinaleVisualizzata() {
  elementi.contrattoAl.value = "";
}

function registraEventi() {
  elementi.nuovoContratto.addEventListener("click", nuovaProcedura);
  elementi.annullaBozza.addEventListener("click", () => {
    void annullaBozzaCorrente();
  });
  elementi.tornaRiepilogo.addEventListener("click", tornaAlRiepilogo);

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

  elementi.contrattoTipologia.addEventListener("change", () => {
    invalidaDataFinaleVisualizzata();
    aggiornaDettaglioTipologia();
  });
  elementi.contrattoDal.addEventListener(
    "change",
    invalidaDataFinaleVisualizzata,
  );
  elementi.formDatiContrattuali.addEventListener(
    "submit",
    salvaDatiContrattualiCorrenti,
  );
  elementi.datiContrattualiIndietro.addEventListener("click", () => {
    nascondiStato();
    mostraStep(3);
  });

  elementi.riepilogoIndietro.addEventListener("click", () => {
    nascondiStato();
    mostraStep(4);
  });
  elementi.vaiConferma.addEventListener("click", () => {
    nascondiStato();
    mostraStep(6);
  });
  elementi.confermaIndietro.addEventListener("click", () => {
    nascondiStato();
    mostraStep(5);
  });
  elementi.confermaContratto.addEventListener("click", () => {
    void confermaBozzaCorrente();
  });
  elementi.nuovaProceduraDopoConferma.addEventListener("click", () => {
    window.location.reload();
  });
}

async function avvia() {
  inizializzaElementi();
  inizializzaFormPersone();
  registraEventi();
  aggiornaStepper();

  try {
    impostaOccupato(
      true,
      "Recupero delle bozze, degli immobili e delle tipologie…",
    );
    const [bozze, immobili, tipologie] = await Promise.all([
      caricaBozze(),
      caricaImmobili(),
      caricaTipologie(),
    ]);

    stato.bozze = bozze;
    stato.immobili = immobili;
    stato.tipologie = tipologie;
    renderImmobili();

    if (bozze.length > 0) {
      renderBozze();
      nascondiPannelli();
      elementi.avvioPanel.hidden = false;
      mostraStato(
        `${bozze.length} ${bozze.length === 1 ? "bozza recuperabile" : "bozze recuperabili"}.`,
        "success",
      );
      aggiornaAzioniProcedura();
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
