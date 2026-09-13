import type GeneratoreDocumentoContratto from "../../application/ports/GeneratoreDocumentoContratto";
import type Contratto from "../../domain/Contratto";
import type Indirizzo from "../../domain/Indirizzo";

const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9.]*)\s*\}\}/g;

function escapeHtml(valore: string): string {
  return valore
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dataIso(data: Date): string {
  const anno = data.getUTCFullYear().toString().padStart(4, "0");
  const mese = (data.getUTCMonth() + 1).toString().padStart(2, "0");
  const giorno = data.getUTCDate().toString().padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

function formattaIndirizzo(indirizzo: Indirizzo): string {
  const parti: string[] = [indirizzo.indirizzo];

  if (indirizzo.civico !== undefined) {
    parti.push(indirizzo.civico);
  }
  if (indirizzo.scala !== undefined) {
    parti.push(`scala ${indirizzo.scala}`);
  }
  if (indirizzo.interno !== undefined) {
    parti.push(`interno ${indirizzo.interno}`);
  }
  if (indirizzo.cap !== undefined) {
    parti.push(indirizzo.cap);
  }

  parti.push(indirizzo.comune, indirizzo.provincia);

  if (indirizzo.nazione !== undefined) {
    parti.push(indirizzo.nazione);
  }

  return parti.join(", ");
}

function valoriPlaceholder(contratto: Contratto): Map<string, string> {
  const { immobile, proprietario, inquilino } = contratto;
  const documento = inquilino.documento;

  const valori = new Map<string, string>([
    ["contratto.nomeDescrizione", contratto.nomeDescrizione],
    ["contratto.dal", dataIso(contratto.dal)],
    ["contratto.al", dataIso(contratto.al)],
    ["contratto.canoneMensile", contratto.canoneMensile.toFixed(2)],
    ["contratto.giornoPagamento", String(contratto.giornoPagamento)],
    ["contratto.registratoIl", dataIso(contratto.registratoIl)],

    ["immobile.nome", immobile.nome],
    ["immobile.indirizzo", formattaIndirizzo(immobile.indirizzo)],
    [
      "immobile.codiceComunale",
      immobile.datiCatastali.codiceComunale,
    ],
    ["immobile.foglio", String(immobile.datiCatastali.foglio)],
    ["immobile.particella", String(immobile.datiCatastali.particella)],
    ["immobile.subalterno", String(immobile.datiCatastali.subalterno)],
    ["immobile.categoria", immobile.datiCatastali.categoria],
    ["immobile.consistenza", String(immobile.datiCatastali.consistenza)],
    ["immobile.rendita", immobile.datiCatastali.rendita.toFixed(2)],

    ["proprietario.nome", proprietario.nome],
    ["proprietario.cognome", proprietario.cognome],
    ["proprietario.codiceFiscale", proprietario.codiceFiscale],
    ["proprietario.luogoNascita", proprietario.luogoNascita],
    ["proprietario.dataNascita", dataIso(proprietario.dataNascita)],
    ["proprietario.residenza", formattaIndirizzo(proprietario.residenza)],

    ["inquilino.nome", inquilino.nome],
    ["inquilino.cognome", inquilino.cognome],
    ["inquilino.codiceFiscale", inquilino.codiceFiscale],
    ["inquilino.luogoNascita", inquilino.luogoNascita],
    ["inquilino.dataNascita", dataIso(inquilino.dataNascita)],
    ["inquilino.residenza", formattaIndirizzo(inquilino.residenza)],
  ]);

  if (documento !== undefined) {
    valori.set("inquilino.documento.tipo", documento.tipo);
    valori.set(
      "inquilino.documento.organoEmittente",
      documento.organoEmittente,
    );
    valori.set(
      "inquilino.documento.dataRilascio",
      dataIso(documento.dataRilascio),
    );
    valori.set(
      "inquilino.documento.dataScadenza",
      dataIso(documento.dataScadenza),
    );
    valori.set("inquilino.documento.numero", documento.numero);
  }

  return valori;
}

function renderizzaTesto(
  testo: string,
  valori: Map<string, string>,
): string {
  const testoEscaped = escapeHtml(testo);

  return testoEscaped
    .replace(PLACEHOLDER, (_match, nome: string) => {
      const valore = valori.get(nome);

      if (valore === undefined) {
        throw new Error(`Placeholder non supportato: {{${nome}}}`);
      }

      return escapeHtml(valore);
    })
    .replace(/\r?\n/g, "<br>");
}

class GeneratoreDocumentoHtmlContratto
  implements GeneratoreDocumentoContratto
{
  genera(contratto: Contratto): string {
    const articoli = [...contratto.tipologia.articoli].sort(
      (primo, secondo) =>
        primo.numArticolo - secondo.numArticolo ||
        primo.numParte - secondo.numParte,
    );

    if (articoli.length === 0) {
      throw new Error(
        "La tipologia contrattuale non contiene articoli da generare",
      );
    }

    const valori = valoriPlaceholder(contratto);
    const righe: string[] = [
      '<section class="contratto">',
      `  <h1>${escapeHtml(contratto.nomeDescrizione)}</h1>`,
    ];

    let articoloCorrente: number | null = null;

    for (const articolo of articoli) {
      if (articolo.numArticolo !== articoloCorrente) {
        if (articoloCorrente !== null) {
          righe.push("  </article>");
        }

        articoloCorrente = articolo.numArticolo;
        righe.push(
          `  <article data-num-articolo="${articolo.numArticolo}">`,
        );
        righe.push(
          `    <h2>Articolo ${articolo.numArticolo} — ${escapeHtml(articolo.titolo)}</h2>`,
        );
      }

      if (articolo.sottotitolo !== undefined) {
        righe.push(
          `    <h3>${escapeHtml(articolo.sottotitolo)}</h3>`,
        );
      }

      righe.push(
        `    <p>${renderizzaTesto(articolo.descrizione, valori)}</p>`,
      );
    }

    righe.push("  </article>", "</section>");

    return righe.join("\n");
  }
}

export = GeneratoreDocumentoHtmlContratto;
