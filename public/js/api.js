async function leggiErrore(response) {
  try {
    const body = await response.json();

    if (typeof body.errore === "string" && body.errore.trim() !== "") {
      return body.errore;
    }
  } catch {
    // La risposta non contiene JSON utilizzabile.
  }

  return `Richiesta non riuscita (${response.status})`;
}

async function richiestaJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await leggiErrore(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function caricaBozze() {
  return richiestaJson("/api/contratti/bozze");
}

function caricaImmobili() {
  return richiestaJson("/api/immobili");
}

function caricaTipologie() {
  return richiestaJson("/api/tipologie-contrattuali");
}

function salvaImmobileEsistente(immobileId, idBozza) {
  return richiestaJson("/api/contratti/bozze/immobile-esistente", {
    method: "POST",
    body: JSON.stringify({
      immobileId,
      ...(idBozza === null ? {} : { idBozza }),
    }),
  });
}

function salvaNuovoImmobile(immobile, idBozza) {
  return richiestaJson("/api/contratti/bozze/immobile-nuovo", {
    method: "POST",
    body: JSON.stringify({
      immobile,
      ...(idBozza === null ? {} : { idBozza }),
    }),
  });
}

function cercaPersona(idBozza, ruolo, codiceFiscale) {
  if (ruolo !== "proprietario" && ruolo !== "inquilino") {
    throw new Error("Ruolo persona non valido");
  }

  return richiestaJson(
    `/api/contratti/bozze/${idBozza}/${ruolo}/${encodeURIComponent(codiceFiscale)}`,
  );
}

function salvaProprietario(idBozza, persona) {
  return richiestaJson(
    `/api/contratti/bozze/${idBozza}/proprietario`,
    {
      method: "PUT",
      body: JSON.stringify({ persona }),
    },
  );
}

function salvaInquilino(idBozza, persona) {
  return richiestaJson(
    `/api/contratti/bozze/${idBozza}/inquilino`,
    {
      method: "PUT",
      body: JSON.stringify({ persona }),
    },
  );
}

function salvaDatiContrattuali(idBozza, dati) {
  return richiestaJson(
    `/api/contratti/bozze/${idBozza}/dati-contrattuali`,
    {
      method: "PUT",
      body: JSON.stringify(dati),
    },
  );
}

function confermaContratto(idBozza) {
  return richiestaJson(
    `/api/contratti/bozze/${idBozza}/conferma`,
    { method: "POST" },
  );
}

function annullaBozza(idBozza) {
  return richiestaJson(
    `/api/contratti/bozze/${idBozza}`,
    { method: "DELETE" },
  );
}

export {
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
};
