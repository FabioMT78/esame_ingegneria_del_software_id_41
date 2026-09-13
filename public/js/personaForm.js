const CODICE_FISCALE_PATTERN =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

function richiesto(id) {
  const elemento = document.getElementById(id);

  if (elemento === null) {
    throw new Error(`Elemento DOM non trovato: ${id}`);
  }

  return elemento;
}

function valoreOpzionale(formData, campo) {
  const valore = formData.get(campo);

  if (typeof valore !== "string") {
    return undefined;
  }

  const normalizzato = valore.trim();
  return normalizzato === "" ? undefined : normalizzato;
}

function valoreRichiesto(formData, campo) {
  const valore = formData.get(campo);

  return typeof valore === "string" ? valore.trim() : "";
}

function conId(id) {
  return Number.isInteger(id) && id > 0 ? { id } : {};
}

function normalizzaCodiceFiscale(valore) {
  return valore.trim().toUpperCase();
}

function validaCodiceFiscale(elemento) {
  const normalizzato = normalizzaCodiceFiscale(elemento.value);
  elemento.value = normalizzato;

  if (!CODICE_FISCALE_PATTERN.test(normalizzato)) {
    elemento.setCustomValidity(
      "Il codice fiscale deve avere 16 caratteri nel formato previsto.",
    );
    elemento.reportValidity();
    return null;
  }

  elemento.setCustomValidity("");
  return normalizzato;
}

function dataIsoLocale(data) {
  const anno = data.getFullYear().toString().padStart(4, "0");
  const mese = (data.getMonth() + 1).toString().padStart(2, "0");
  const giorno = data.getDate().toString().padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

function sottraiAnniConLimite(data, anni) {
  const anno = data.getFullYear() - anni;
  const mese = data.getMonth();
  const giorno = data.getDate();
  const ultimoGiorno = new Date(anno, mese + 1, 0).getDate();

  return new Date(anno, mese, Math.min(giorno, ultimoGiorno));
}

function applicaLimitiDataNascita(elemento) {
  const oggi = new Date();
  elemento.min = dataIsoLocale(sottraiAnniConLimite(oggi, 150));
  elemento.max = dataIsoLocale(sottraiAnniConLimite(oggi, 18));
}

function creaGestorePersona({
  prefix,
  richiedeDocumento,
  onCerca,
  onSalva,
  onIndietro,
}) {
  const elementi = {
    formRicerca: richiesto(`${prefix}-form-ricerca`),
    cfRicerca: richiesto(`${prefix}-cf-ricerca`),
    esitoRicerca: richiesto(`${prefix}-esito-ricerca`),
    formDati: richiesto(`${prefix}-form-dati`),
    cfDati: richiesto(`${prefix}-codice-fiscale`),
    dataNascita: richiesto(`${prefix}-data-nascita`),
    cambiaCf: richiesto(`${prefix}-cambia-cf`),
    indietro: richiesto(`${prefix}-indietro`),
  };

  applicaLimitiDataNascita(elementi.dataNascita);

  elementi.cfRicerca.addEventListener("input", () => {
    elementi.cfRicerca.value = elementi.cfRicerca.value.toUpperCase();
    elementi.cfRicerca.setCustomValidity("");
  });

  let personaBase = null;

  function campo(nome) {
    return richiesto(`${prefix}-${nome}`);
  }

  function assegna(nome, valore) {
    campo(nome).value = valore ?? "";
  }

  function mostraEsito(messaggio) {
    elementi.esitoRicerca.textContent = messaggio;
    elementi.esitoRicerca.hidden = false;
  }

  function nascondiEsito() {
    elementi.esitoRicerca.textContent = "";
    elementi.esitoRicerca.hidden = true;
  }

  function svuotaDati() {
    elementi.formDati.reset();
    elementi.cfDati.value = "";
  }

  function compilaPersona(persona) {
    assegna("nome", persona.nome);
    assegna("cognome", persona.cognome);
    assegna("codice-fiscale", persona.codiceFiscale);
    assegna("luogo-nascita", persona.luogoNascita);
    assegna("data-nascita", persona.dataNascita);

    assegna("nazione", persona.residenza.nazione);
    assegna("provincia", persona.residenza.provincia);
    assegna("comune", persona.residenza.comune);
    assegna("cap", persona.residenza.cap);
    assegna("indirizzo", persona.residenza.indirizzo);
    assegna("civico", persona.residenza.civico);
    assegna("scala", persona.residenza.scala);
    assegna("interno", persona.residenza.interno);

    if (richiedeDocumento) {
      const documento = persona.documento;

      assegna("documento-tipo", documento?.tipo);
      assegna("documento-numero", documento?.numero);
      assegna("documento-organo", documento?.organoEmittente);
      assegna("documento-rilascio", documento?.dataRilascio);
      assegna("documento-scadenza", documento?.dataScadenza);
    }
  }

  function mostraPersona(persona, codiceFiscale) {
    personaBase = persona;
    svuotaDati();

    if (persona === null) {
      elementi.cfDati.value = codiceFiscale;
      mostraEsito(
        "Persona non presente: completa i dati per aggiungerla alla bozza.",
      );
    } else {
      compilaPersona(persona);
      mostraEsito(
        "Persona trovata: verifica i dati e modifica quelli consentiti.",
      );
    }

    elementi.formDati.hidden = false;
  }

  function caricaDaBozza(persona) {
    nascondiEsito();

    if (persona === null || persona === undefined) {
      personaBase = null;
      elementi.formRicerca.reset();
      svuotaDati();
      elementi.formDati.hidden = true;
      return;
    }

    personaBase = persona;
    elementi.cfRicerca.value = persona.codiceFiscale;
    compilaPersona(persona);
    elementi.formDati.hidden = false;
    mostraEsito("Dati recuperati dalla bozza.");
  }

  function leggiPersona() {
    const dati = new FormData(elementi.formDati);

    const residenza = {
      ...conId(personaBase?.residenza?.id),
      ...(valoreOpzionale(dati, "nazione") === undefined
        ? {}
        : { nazione: valoreOpzionale(dati, "nazione") }),
      provincia: valoreRichiesto(dati, "provincia"),
      comune: valoreRichiesto(dati, "comune"),
      ...(valoreOpzionale(dati, "cap") === undefined
        ? {}
        : { cap: valoreOpzionale(dati, "cap") }),
      indirizzo: valoreRichiesto(dati, "indirizzo"),
      ...(valoreOpzionale(dati, "civico") === undefined
        ? {}
        : { civico: valoreOpzionale(dati, "civico") }),
      ...(valoreOpzionale(dati, "scala") === undefined
        ? {}
        : { scala: valoreOpzionale(dati, "scala") }),
      ...(valoreOpzionale(dati, "interno") === undefined
        ? {}
        : { interno: valoreOpzionale(dati, "interno") }),
    };

    const persona = {
      ...conId(personaBase?.id),
      nome: valoreRichiesto(dati, "nome"),
      cognome: valoreRichiesto(dati, "cognome"),
      luogoNascita: valoreRichiesto(dati, "luogoNascita"),
      dataNascita: valoreRichiesto(dati, "dataNascita"),
      codiceFiscale: normalizzaCodiceFiscale(
        valoreRichiesto(dati, "codiceFiscale"),
      ),
      residenza,
    };

    if (richiedeDocumento) {
      persona.documento = {
        ...conId(personaBase?.documento?.id),
        tipo: valoreRichiesto(dati, "documentoTipo"),
        numero: valoreRichiesto(dati, "documentoNumero"),
        organoEmittente: valoreRichiesto(dati, "documentoOrgano"),
        dataRilascio: valoreRichiesto(dati, "documentoRilascio"),
        dataScadenza: valoreRichiesto(dati, "documentoScadenza"),
      };
    }

    return persona;
  }

  elementi.formRicerca.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const codiceFiscale = validaCodiceFiscale(elementi.cfRicerca);

    if (codiceFiscale === null || !elementi.formRicerca.reportValidity()) {
      return;
    }

    try {
      const persona = await onCerca(codiceFiscale);
      mostraPersona(persona, codiceFiscale);
    } catch {
      return;
    }
  });

  elementi.formDati.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!elementi.formDati.reportValidity()) {
      return;
    }

    try {
      await onSalva(leggiPersona());
    } catch {
      return;
    }
  });

  elementi.cambiaCf.addEventListener("click", () => {
    personaBase = null;
    svuotaDati();
    elementi.formDati.hidden = true;
    nascondiEsito();
    elementi.cfRicerca.focus();
  });

  elementi.indietro.addEventListener("click", onIndietro);

  return {
    caricaDaBozza,
  };
}

export { creaGestorePersona };
