// Les prompts de la semaine 3, assemblés à partir des blocs de prompts/lexique.js.

import { ROLE, LEXIQUE, REGLES } from './lexique.js';

// Étape 1 — on DEMANDE du JSON dans le texte du prompt, sans aucune garantie de l'API.
export const PROMPT_JSON_DEMANDE = `
${ROLE}

TÂCHE
On te donne UNE ligne recopiée du cahier. Transforme chaque élément de la ligne en objet JSON.

${LEXIQUE}

${REGLES}

FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec un objet JSON de cette forme :
{
  "elements": [
    { "type": "voyage", "numero": 7, "quantite": 2, "produit": "sable", "origine": "Ampasika", "destination": "Ivato",
      "montant": 120000, "retenue": 50000, "statut": "paye" },
    { "type": "depense", "nature": "repas", "montant": 12000 },
    { "type": "mouvement", "nature": "apport", "montant": 100000 },
    { "type": "solde", "montant": 113000 },
    { "type": "inconnu", "texte": "Kapoaka" }
  ]
}
- "statut" vaut "paye", "paye_maison" (Service) ou "en_attente" (Miandry vola).
- "nature" d'un mouvement vaut "apport", "total" ou "autre".
- Les montants sont des nombres entiers en Ariary. Une information non écrite vaut null.
`.trim();
