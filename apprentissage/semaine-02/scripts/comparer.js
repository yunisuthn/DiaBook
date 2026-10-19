// Compare deux façons de demander la MÊME chose au modèle :
//   A. le prompt « nu » : juste la ligne du cahier, comme en semaine 1 ;
//   B. un prompt construit : instructions système (rôle, tâche, contexte, contraintes, format)
//      + la ligne dans le message utilisateur.
//
// Usage :
//   npm run comparer                       → la 1re ligne de donnees/lignes.js
//   npm run comparer -- 3                  → la 3e ligne
//   npm run comparer -- "ma ligne à moi"   → une ligne de ton choix

import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { LIGNES } from '../donnees/lignes.js';

// --- Le prompt système : ce que le modèle doit savoir AVANT de lire la ligne ----------
// Il est écrit une fois et réutilisé pour chaque ligne : c'est la « fiche de poste » du modèle.
const INSTRUCTIONS_SYSTEME = `
RÔLE
Tu aides à numériser les cahiers de bord de camions qui transportent des matériaux à Antananarivo (Madagascar).

TÂCHE
On te donne UNE ligne recopiée du cahier. Dis en français ce qu'elle signifie.

CONTEXTE (vocabulaire du cahier)
- « vgs » = voyage(s). « 2vgs » = 2 voyages.
- Fasika = sable ; Biriky = brique ; Gravillon = gravillon.
- Le chiffre entouré (⑦, ⑧…) est le numéro du voyage.
- « A -> B » = trajet de A vers B. Les noms de lieux sont des quartiers ou des villes : ne les traduis pas.
- « Frais » ou « Vola » = montant payé pour le voyage, en Ariary (Ar).
- « 120000 - 50000 » = montant de 120 000 Ar moins une retenue de 50 000 Ar.

CONTRAINTES
- N'invente rien. Si un mot n'est pas dans ce vocabulaire, recopie-le tel quel suivi de « (?) ».
- Ne fais aucun calcul : recopie les montants tels qu'ils sont écrits.

FORMAT
Une seule phrase, en texte brut, sans Markdown.
`.trim();

// --- Choisir la ligne à tester ---------------------------------------------------------
const argument = process.argv[2];
const numero = Number(argument);
const ligne = !argument
  ? LIGNES[0]
  : Number.isInteger(numero) && numero >= 1 && numero <= LIGNES.length
    ? LIGNES[numero - 1]
    : argument;

console.log(`Modèle : ${MODELE} · température 0`);
console.log(`Ligne  : ${ligne}\n`);

try {
  const ai = creerClient();

  // A. Prompt nu : le modèle doit deviner ce qu'on attend de lui.
  const a = await ai.models.generateContent({
    model: MODELE,
    contents: ligne,
    config: { temperature: 0 },
  });
  afficher('A. Prompt nu (la ligne seule)', a);

  // B. Même ligne, mais avec des instructions système.
  // systemInstruction est séparé du message : c'est le cadre, la ligne est la donnée.
  const b = await ai.models.generateContent({
    model: MODELE,
    contents: ligne,
    config: { temperature: 0, systemInstruction: INSTRUCTIONS_SYSTEME },
  });
  afficher('B. Prompt construit (instructions système + ligne)', b);
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}

function afficher(titre, reponse) {
  const u = reponse.usageMetadata ?? {};
  console.log(`=== ${titre}`);
  console.log(reponse.text?.trim());
  console.log(
    `(entrée ${u.promptTokenCount ?? 0} tokens · sortie ${u.candidatesTokenCount ?? 0} tokens)\n`,
  );
}
