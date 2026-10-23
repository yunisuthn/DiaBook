// Étape 5 : les AVERTISSEMENTS d'une journée validée.
// Un refus (Zod) veut dire « la lecture est fausse » : on relance le modèle.
// Un avertissement veut dire « la lecture est juste, mais le cahier est incomplet » : relancer ne servirait à rien,
// c'est l'utilisateur qui complète au moment de valider la journée.

// Renvoie la liste des avertissements : [] si rien à signaler.
// Chaque avertissement : { chemin, message } ; « chemin » désigne le champ, comme dans les erreurs de Zod.
export function avertissements(journee) {
  return journee.elements.flatMap((el, i) =>
    el.type === 'voyage' && el.statut === 'en_attente' && el.montant === null
      ? [
          {
            chemin: `elements[${i}].montant`,
            message: `voyage ${el.numero ?? '?'} en attente sans montant écrit : à compléter par l’utilisateur`,
          },
        ]
      : [],
  );
}
