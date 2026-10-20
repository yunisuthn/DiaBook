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
import { PROMPTS } from '../prompts/cahier.js';

// Le prompt système de l'étape 1 est maintenant rangé (et versionné) dans prompts/cahier.js.
const INSTRUCTIONS_SYSTEME = PROMPTS.v0;

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
