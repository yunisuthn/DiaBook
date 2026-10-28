// Semaine 3, étape 5 : comparer automatiquement une journée lue à son « attendu » (donnees/journees.js).
// « Valide » (Zod) veut dire « la forme est bonne ». « Conforme » veut dire « c'est ce qui est écrit sur la page ».
// Une réponse peut être valide et fausse : par exemple un Reste mal recopié.

import { regrouper } from '../schemas/journee-zod.js';

// Renvoie la liste des écarts : [] si la lecture est conforme.
// Chaque écart : { champ, attendu, lu }.
export function comparerAttendu(journee, attendu) {
  const j = regrouper(journee);
  const lu = {
    date: j.date,
    voyages: j.voyages.length,
    depenses: j.depenses.length,
    reste: j.reste,
  };

  return Object.keys(attendu)
    .filter((champ) => lu[champ] !== attendu[champ])
    .map((champ) => ({ champ, attendu: attendu[champ], lu: lu[champ] }));
}

// Semaine 4, étape 2 : un contrôle plus strict, pour les images.
// comparerAttendu() ne regarde que des compteurs, la date et le Reste : un montant mal lu (165000 → 185000)
// passerait inaperçu. Ici, on vérifie que TOUS les nombres écrits sur la page se retrouvent dans le JSON.
//
// Les nombres de la page : tout nombre d'au moins 4 chiffres du texte tapé (les montants ; la date « 28-09-26 »
// et les quantités « 1vgs » n'en ont pas 4). Les nombres lus : chaque montant et chaque retenue des éléments.
// Renvoie null si tout correspond, sinon { manquants, enTrop } (ce qui est sur la page et pas lu, et l'inverse).
export function comparerNombres(journee, texte) {
  const page = (texte.match(/\d{4,}/g) ?? []).map(Number);
  const lus = journee.elements.flatMap((e) => [e.montant, e.retenue]).filter((n) => n != null);

  const manquants = soustraire(page, lus);
  const enTrop = soustraire(lus, page);
  return manquants.length || enTrop.length ? { manquants, enTrop } : null;
}

// a − b en tenant compte des doublons : [12000, 12000, 5000] − [12000] = [12000, 5000].
function soustraire(a, b) {
  const reste = [...b];
  return a.filter((n) => {
    const i = reste.indexOf(n);
    if (i === -1) return true;
    reste.splice(i, 1);
    return false;
  });
}
