// Normalisation des noms de lieux : dictionnaire + distance d'édition.
// Dans l'application, ce dictionnaire vient de la table `lieu` (nom + variantes), enrichie à chaque validation.
export const LIEUX = [
  "Ambohitrimanjaka", "Ambohitrarahaba", "Ambohipanja", "Ambodifahitra", "Ambatomitsangana",
  "Ambatofotsy", "Ankadivoribe", "Antanetibe", "Antanety", "Anosy", "Atsapandrano", "Bedobo",
  "Faravohitra", "Ilafy", "Lalam-baovao", "Lazaina", "Manandriana", "Salanitra", "Sabotsy",
  "Soavimasoandro", "Soavinimerina", "Antanambao", "Antsahatsiroa",
];

const sansAccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** → { nom, connu, distance } ; connu=false si rien d'assez proche */
export function normaliserLieu(brut) {
  if (!brut) return { nom: null, connu: false, distance: null };
  const cle = sansAccent(brut.replace(/\(\?\)/g, ""));
  let best = null;
  for (const l of LIEUX) {
    const dist = levenshtein(cle, sansAccent(l));
    if (!best || dist < best.distance) best = { nom: l, distance: dist };
  }
  const seuil = Math.max(2, Math.floor(cle.length * 0.25));
  return best.distance <= seuil ? { ...best, connu: true } : { nom: brut, connu: false, distance: best.distance };
}
