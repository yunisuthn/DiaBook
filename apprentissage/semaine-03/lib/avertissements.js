// Étape 5 : les AVERTISSEMENTS d'une journée validée.
// Un refus (Zod) veut dire « la lecture est fausse » : on relance le modèle.
// Un avertissement veut dire « la lecture est juste, mais le cahier est incomplet » : relancer ne servirait à rien,
// c'est l'utilisateur qui complète au moment de valider la journée.

// Chaque règle : quand l'appliquer (si), et quoi dire (avertir).
// Pour ajouter un avertissement, on ajoute une règle : la fonction avertissements() ne change pas.
const REGLES = [
  {
    si: (el) => el.type === 'voyage' && el.statut === 'en_attente' && el.montant === null,
    avertir: (el, i) => ({
      chemin: `elements[${i}].montant`,
      message: `voyage ${el.numero ?? '?'} en attente sans montant écrit : à compléter par l’utilisateur`,
    }),
  },
  {
    // Ex. « Kapoaka 3000 » : le receveur l'a compté dans son Reste, mais on ne sait pas ce que c'est.
    // Sans classement, le calcul du solde (semaine 5) aurait un faux écart de ce montant.
    si: (el) => el.type === 'inconnu' && el.montant !== null,
    avertir: (el, i) => ({
      chemin: `elements[${i}]`,
      message: `« ${el.texte} » (${el.montant}) hors lexique : à classer par l’utilisateur (dépense, mouvement…)`,
    }),
  },
];

// Renvoie la liste des avertissements : [] si rien à signaler.
// Chaque avertissement : { chemin, message } ; « chemin » désigne le champ, comme dans les erreurs de Zod.
export function avertissements(journee) {
  return journee.elements.flatMap((el, i) =>
    REGLES.filter((regle) => regle.si(el)).map((regle) => regle.avertir(el, i)),
  );
}
