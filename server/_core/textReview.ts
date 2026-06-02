const commonCorrections: Array<[RegExp, string]> = [
  [/\bnao\b/gi, "não"],
  [/\bvoce\b/gi, "você"],
  [/\bvoces\b/gi, "vocês"],
  [/\besta\b/gi, "está"],
  [/\btambem\b/gi, "também"],
  [/\bja\b/gi, "já"],
  [/\bso\b/gi, "só"],
  [/\bapos\b/gi, "após"],
  [/\bpagina\b/gi, "página"],
  [/\bpaginas\b/gi, "páginas"],
  [/\bhistoria\b/gi, "história"],
  [/\bcrianca\b/gi, "criança"],
  [/\bcoracao\b/gi, "coração"],
  [/\bprofessor\b/gi, "professor"],
  [/\beducador\b/gi, "educador"],
  [/\baluno\b/gi, "aluno"],
];

function preserveCase(original: string, replacement: string) {
  if (original.toUpperCase() === original) return replacement.toUpperCase();
  if (original[0]?.toUpperCase() === original[0]) {
    return `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`;
  }
  return replacement;
}

function improveTextNode(value: string) {
  let next = value.replace(/\s{2,}/g, " ");

  for (const [pattern, replacement] of commonCorrections) {
    next = next.replace(pattern, (match) => preserveCase(match, replacement));
  }

  next = next.replace(/([.!?]\s+)([a-záàâãéêíóôõúç])/g, (_match, punctuation: string, letter: string) => {
    return `${punctuation}${letter.toUpperCase()}`;
  });

  next = next.replace(/^(\s*)([a-záàâãéêíóôõúç])/, (_match, spacing: string, letter: string) => {
    return `${spacing}${letter.toUpperCase()}`;
  });

  return next;
}

export function stripHtml(content?: string | null) {
  return (content ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(content?: string | null) {
  return stripHtml(content).split(/\s+/).filter(Boolean).length;
}

export function polishHtmlForEducator(content?: string | null) {
  const raw = content ?? "";
  const parts = raw.split(/(<[^>]+>)/g);
  let changedWords = 0;

  const corrected = parts
    .map((part) => {
      if (part.startsWith("<") && part.endsWith(">")) return part;
      const improved = improveTextNode(part);
      if (improved !== part) {
        changedWords += Math.max(1, Math.abs(improved.length - part.length));
      }
      return improved;
    })
    .join("");

  if (corrected === raw) {
    return {
      corrected,
      changed: false,
      summary: "A IA revisou a página e não encontrou ajustes gramaticais simples antes do envio.",
    };
  }

  return {
    corrected,
    changed: true,
    summary:
      changedWords > 0
        ? "A IA corrigiu acentuação, espaçamentos e capitalização sem alterar a ideia do aluno."
        : "A IA fez uma revisão leve sem alterar a essência do texto.",
  };
}

export function buildWritingGuidance({
  pages,
  words,
  averageScore,
}: {
  pages: number;
  words: number;
  averageScore: number | null;
}) {
  if (pages === 0) return "Comece criando a primeira página do livro e escreva uma cena completa.";
  if (words < 250) return "Amplie as ideias com começo, desenvolvimento e final mais claros.";
  if (averageScore !== null && averageScore < 7) return "Revise os comentários do educador e reescreva os trechos mais confusos.";
  if (averageScore !== null && averageScore >= 8.5) return "Você está indo muito bem. Continue melhorando detalhes, diálogos e ritmo.";
  return "Continue escrevendo com atenção à coerência, pontuação e continuidade entre as páginas.";
}
