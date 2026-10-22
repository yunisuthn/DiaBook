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

// Étape 2 — le JSON est IMPOSÉ par l'API (responseMimeType + responseJsonSchema, voir schemas/ligne.js).
// Le prompt n'a plus besoin de montrer la forme du JSON : il explique seulement le SENS des champs.
export const PROMPT_JSON_IMPOSE = `
${ROLE}

TÂCHE
On te donne UNE ligne recopiée du cahier. Transforme chaque élément de la ligne en un élément de la liste « elements ».

${LEXIQUE}

${REGLES}

SENS DES CHAMPS
- type : voyage, depense, mouvement (argent qui entre ou total écrit), solde (« Reste »), inconnu (mot hors lexique).
- statut d'un voyage : paye, paye_maison (Service) ou en_attente (Miandry vola).
- nature : pour une dépense, sa nature en français (repas, gasoil…) ; pour un mouvement : apport, total ou autre.
- Un champ qui ne concerne pas l'élément, ou une information non écrite, vaut null.
- Pour un élément inconnu, mets le mot dans « texte » et le nombre qui le suit dans « montant ».
`.trim();

// Étape 4 — une JOURNÉE entière (toutes les lignes d'une page) en un seul appel.
// Le schéma (schemas/journee-zod.js) est imposé par l'API : le prompt explique le sens.
export const PROMPT_JOURNEE = `
${ROLE}

TÂCHE
On te donne TOUTES les lignes d'une page du cahier : une journée. Remplis l'objet journée :
- la date écrite en haut de la page (« date_ecrite », telle quelle) et la même date au format AAAA-MM-JJ (« date ») ;
- la liste « elements » : chaque élément de chaque ligne, dans l'ordre de la page.

${LEXIQUE}

${REGLES}

SENS DES CHAMPS
- type : voyage, depense, mouvement (argent qui entre, ou total écrit), solde (« Reste »), inconnu (mot hors lexique).
- statut d'un voyage : paye, paye_maison (Service) ou en_attente (Miandry vola).
- nature : pour une dépense, sa nature en français (repas, gasoil…) ; pour un mouvement : apport, total ou autre.
- Les années écrites avec 2 chiffres sont des années 20xx (« 26 » → 2026).
- Si la date n'est pas écrite sur la page, « date_ecrite » et « date » valent null : ne la devine pas.
- Une information non écrite vaut null.
- Pour un élément inconnu, mets le mot dans « texte » et le nombre qui le suit dans « montant ».
`.trim();
