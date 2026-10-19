// Normalisation des noms de lieux : dictionnaire + distance d'édition (repris de cahier-extract/src/lieux.js).
// Dans l'application, ce dictionnaire vient de la table `lieux` (nom + variantes), enrichie à chaque validation.
export const LIEUX = [
  'Ambohitrimanjaka',
  'Ambohitrarahaba',
  'Ambohipanja',
  'Ambodifahitra',
  'Ambatomitsangana',
  'Ambatofotsy',
  'Ankadivoribe',
  'Antanetibe',
  'Antanety',
  'Anosy',
  'Atsapandrano',
  'Bedobo',
  'Faravohitra',
  'Ilafy',
  'Lalam-baovao',
  'Lazaina',
  'Manandriana',
  'Salanitra',
  'Sabotsy',
  'Soavimasoandro',
  'Soavinimerina',
  'Antanambao',
  'Antsahatsiroa',
];

const sansAccent = (texte: string): string =>
  texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

function levenshtein(a: string, b: string): number {
  let precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      courante[j] = Math.min(
        (precedente[j] ?? 0) + 1,
        (courante[j - 1] ?? 0) + 1,
        (precedente[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    precedente = courante;
  }
  return precedente[b.length] ?? 0;
}

export type LieuNormalise =
  | { nom: string; connu: true; distance: number }
  | { nom: string | null; connu: false; distance: number | null };

/** → { nom, connu, distance } ; connu = false si rien d'assez proche dans le dictionnaire. */
export function normaliserLieu(
  brut: string | null | undefined,
  dictionnaire: readonly string[] = LIEUX,
): LieuNormalise {
  if (!brut) return { nom: null, connu: false, distance: null };
  const cle = sansAccent(brut.replace(/\(\?\)/g, ''));
  let meilleur: { nom: string; distance: number } | null = null;
  for (const lieu of dictionnaire) {
    const distance = levenshtein(cle, sansAccent(lieu));
    if (!meilleur || distance < meilleur.distance) meilleur = { nom: lieu, distance };
  }
  if (!meilleur) return { nom: brut, connu: false, distance: null };
  const seuil = Math.max(2, Math.floor(cle.length * 0.25));
  return meilleur.distance <= seuil
    ? { ...meilleur, connu: true }
    : { nom: brut, connu: false, distance: meilleur.distance };
}
