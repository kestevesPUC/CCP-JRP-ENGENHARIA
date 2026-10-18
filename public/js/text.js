/** Normaliza texto para busca: minúsculas e sem acentos ("Ação" -> "acao"). */
export const normalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** true se todas as palavras da pesquisa aparecem no texto (busca por termos, em qualquer ordem). */
export function matchesSearch(haystack, query) {
  const text = normalize(haystack);
  return normalize(query).split(/\s+/).filter(Boolean).every((term) => text.includes(term));
}
