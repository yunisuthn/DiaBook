// Étape 5 : comparer automatiquement une journée lue à son « attendu » (donnees/journees.js).
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
