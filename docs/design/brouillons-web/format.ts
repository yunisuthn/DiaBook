const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 1234567 → « 1 234 567 » ; les négatifs prennent un vrai signe moins. */
export function formaterMontant(montant: number): string {
  return nombre.format(montant).replace('-', '−');
}

/** Lit un montant saisi : seuls les chiffres comptent (« 120 000 Ar » → 120000). */
export function lireMontant(texte: string): number {
  const chiffres = texte.replace(/\D/g, '');
  return chiffres === '' ? 0 : Number.parseInt(chiffres, 10);
}

const JOURS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MOIS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const MOIS_LONGS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

// Les dates du cahier n'ont pas d'heure : on les traite en UTC pour éviter tout décalage de fuseau.
function versDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

function versIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** « 2026-10-01 » → « 1er oct. » */
export function formaterDateCourte(iso: string): string {
  const date = versDate(iso);
  const jour = date.getUTCDate();
  return `${jour === 1 ? '1er' : jour} ${MOIS[date.getUTCMonth()]}`;
}

/** « 2026-10-05 » → « Lun. 5 oct. » */
export function formaterJour(iso: string): string {
  return `${JOURS[versDate(iso).getUTCDay()]} ${formaterDateCourte(iso)}`;
}

/** « 2026-10-07T09:42 » → « 7 oct. 09:42 » */
export function formaterHorodatage(horodatage: string): string {
  return `${formaterDateCourte(horodatage)} ${horodatage.slice(11, 16)}`;
}

/** « 2026-10 » → « Octobre 2026 » */
export function formaterMois(isoMois: string): string {
  const [annee, mois] = isoMois.split('-');
  const nom = MOIS_LONGS[Number(mois) - 1] ?? '';
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${annee}`;
}

/** « Du 1er oct. au 7 oct. 2026 », ou le jour seul si la période tient en un jour. */
export function formaterPeriode(debut: string, fin: string): string {
  const annee = fin.slice(0, 4);
  if (debut === fin) return `${formaterJour(fin)} ${annee}`;
  return `Du ${formaterDateCourte(debut)} au ${formaterDateCourte(fin)} ${annee}`;
}

export function ajouterJours(iso: string, jours: number): string {
  const date = versDate(iso);
  date.setUTCDate(date.getUTCDate() + jours);
  return versIso(date);
}

export function joursEntre(debut: string, fin: string): number {
  return Math.round((versDate(fin).getTime() - versDate(debut).getTime()) / 86_400_000);
}

/** « 1 jour », « 3 jours » */
export function pluriel(nombreElements: number, mot: string, motPluriel = `${mot}s`): string {
  return `${nombreElements} ${nombreElements > 1 ? motPluriel : mot}`;
}
