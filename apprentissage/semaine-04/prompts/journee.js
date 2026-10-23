// Les prompts de la semaine 4, assemblés à partir des blocs de prompts/lexique.js.

import { ROLE, LEXIQUE, REGLES } from './lexique.js';

// Semaine 3, étape 4 — une JOURNÉE entière, TAPÉE (toutes les lignes d'une page) en un seul appel.
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

// Semaine 4, étape 1 — la PHOTO d'une page : mêmes blocs, même schéma, mais le modèle doit LIRE l'image.
// Nouveau : que faire de ce qui est illisible (sur une photo, ça arrive ; sur un texte tapé, jamais).
export const PROMPT_PHOTO = `
${ROLE}

TÂCHE
On te donne la PHOTO d'une page du cahier : une journée. Lis-la ligne par ligne, de haut en bas, et remplis l'objet journée :
- la date écrite en haut de la page (« date_ecrite », telle quelle) et la même date au format AAAA-MM-JJ (« date ») ;
- la liste « elements » : chaque élément de chaque ligne, dans l'ordre de la page.

${LEXIQUE}

${REGLES}

LECTURE DE LA PHOTO
- Ne lis que ce qui est écrit sur la page : pas de ce que tu attends, ni de ce qui « devrait » y être.
- Un nombre que tu n'arrives pas à lire avec certitude vaut null : ne le devine pas.
- Un mot que tu n'arrives pas à lire est un élément inconnu : mets dans « texte » ce que tu lis, avec « ? » à la place
  des lettres illisibles.

SENS DES CHAMPS
- type : voyage, depense, mouvement (argent qui entre, ou total écrit), solde (« Reste »), inconnu (mot hors lexique ou illisible).
- statut d'un voyage : paye, paye_maison (Service) ou en_attente (Miandry vola).
- nature : pour une dépense, sa nature en français (repas, gasoil…) ; pour un mouvement : apport, total ou autre.
- Les années écrites avec 2 chiffres sont des années 20xx (« 26 » → 2026).
- Si la date n'est pas écrite sur la page, « date_ecrite » et « date » valent null : ne la devine pas.
- Une information non écrite vaut null.
- Pour un élément inconnu, mets le mot dans « texte » et le nombre qui le suit dans « montant ».
`.trim();
