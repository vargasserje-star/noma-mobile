// Detects likely gender from a Spanish first name.
// Returns "f" (feminine) or "m" (masculine).
// Heuristic: names ending in "a" are usually feminine.
// Exception list covers common feminine names that don't end in "a".

const FEMININE_EXCEPTIONS = new Set([
  "isabel", "pilar", "flor", "mercedes", "dolores", "lourdes",
  "guadalupe", "trinidad", "belen", "carmen", "ines", "ester",
  "esther", "judith", "ruth", "naomi", "raquel", "rachel",
  "rocio", "sol", "mar", "luz", "paz", "fe",
  "montserrat", "neus", "creu", "noor", "inés",
]);

export function detectGender(fullName: string): "f" | "m" {
  const first = fullName
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents for comparison

  if (FEMININE_EXCEPTIONS.has(first)) return "f";
  if (first.endsWith("a")) return "f";
  return "m";
}
