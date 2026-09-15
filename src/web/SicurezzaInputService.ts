type CategoriaMinaccia = "XSS" | "SQL_INJECTION";

type PatternSospetto = Readonly<{
  id: string;
  categoria: CategoriaMinaccia;
  regex: RegExp;
}>;

type RilevazioneInputSospetto = Readonly<{
  percorso: string;
  patternId: string;
  categoria: CategoriaMinaccia;
  valorePerLog: string;
}>;

const PATTERN_SOSPETTI: readonly PatternSospetto[] = [
  {
    id: "XSS_SCRIPT_TAG",
    categoria: "XSS",
    regex: /<\s*script\b/i,
  },
  {
    id: "XSS_JAVASCRIPT_URI",
    categoria: "XSS",
    regex: /javascript\s*:/i,
  },
  {
    id: "XSS_EVENT_HANDLER",
    categoria: "XSS",
    regex: /\bon[a-z]+\s*=/i,
  },
  {
    id: "XSS_DANGEROUS_TAG",
    categoria: "XSS",
    regex: /<\s*(?:iframe|object|embed)\b/i,
  },
  {
    id: "XSS_HTML_DATA_URI",
    categoria: "XSS",
    regex: /data\s*:\s*text\/html/i,
  },
  {
    id: "SQL_UNION_SELECT",
    categoria: "SQL_INJECTION",
    regex: /\bunion\s+(?:all\s+)?select\b/i,
  },
  {
    id: "SQL_TAUTOLOGY",
    categoria: "SQL_INJECTION",
    regex:
      /\b(?:or|and)\b\s+(?:\d+|'[^']*'|"[^"]*")\s*=\s*(?:\d+|'[^']*'|"[^"]*")/i,
  },
  {
    id: "SQL_COMMENT",
    categoria: "SQL_INJECTION",
    regex: /(?:'|"|;|\d)\s*--|\/\*[\s\S]*?\*\//i,
  },
  {
    id: "SQL_DESTRUCTIVE_STATEMENT",
    categoria: "SQL_INJECTION",
    regex: /\b(?:drop\s+table|truncate\s+table|delete\s+from)\b/i,
  },
  {
    id: "SQL_STACKED_STATEMENT",
    categoria: "SQL_INJECTION",
    regex:
      /;\s*(?:select|insert\s+into|update|delete\s+from|drop\s+table|alter\s+table|truncate\s+table)\b/i,
  },
];

function sanitizzaValorePerLog(valore: string): string {
  const limitato = valore.slice(0, 200);

  return JSON.stringify(limitato)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026");
}

class ErroreInputSospetto extends Error {
  readonly rilevazione: RilevazioneInputSospetto;

  constructor(rilevazione: RilevazioneInputSospetto) {
    super("Input HTTP non ammesso");
    this.name = "ErroreInputSospetto";
    this.rilevazione = rilevazione;
  }
}

class SicurezzaInputService {
  verifica<T>(valore: T, percorso = "input"): T {
    const rilevazione = this.cerca(valore, percorso);

    if (rilevazione !== null) {
      throw new ErroreInputSospetto(rilevazione);
    }

    return valore;
  }

  private cerca(
    valore: unknown,
    percorso: string,
  ): RilevazioneInputSospetto | null {
    if (typeof valore === "string") {
      return this.cercaNellaStringa(valore, percorso);
    }

    if (Array.isArray(valore)) {
      for (let indice = 0; indice < valore.length; indice += 1) {
        const rilevazione = this.cerca(
          valore[indice],
          `${percorso}[${indice}]`,
        );

        if (rilevazione !== null) {
          return rilevazione;
        }
      }

      return null;
    }

    if (typeof valore === "object" && valore !== null) {
      for (const [chiave, elemento] of Object.entries(valore)) {
        const rilevazione = this.cerca(
          elemento,
          `${percorso}.${chiave}`,
        );

        if (rilevazione !== null) {
          return rilevazione;
        }
      }
    }

    return null;
  }

  private cercaNellaStringa(
    valore: string,
    percorso: string,
  ): RilevazioneInputSospetto | null {
    for (const pattern of PATTERN_SOSPETTI) {
      if (pattern.regex.test(valore)) {
        return {
          percorso,
          patternId: pattern.id,
          categoria: pattern.categoria,
          valorePerLog: sanitizzaValorePerLog(valore),
        };
      }
    }

    return null;
  }
}

export { ErroreInputSospetto, SicurezzaInputService };
export type { CategoriaMinaccia, RilevazioneInputSospetto };
