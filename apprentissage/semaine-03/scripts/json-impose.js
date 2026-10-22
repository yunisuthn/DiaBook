// Étape 2 : le JSON est IMPOSÉ par l'API. On donne à Gemini :
//   - responseMimeType: 'application/json'  → la réponse est forcément du JSON (pas de ```json, pas de texte autour) ;
//   - responseJsonSchema: SCHEMA_LIGNE       → ce JSON a forcément la forme décrite par le schéma.
// Plus besoin de « rustine » : JSON.parse suffit.
//
// Usage :
//   npm run json-impose              → les 7 lignes de test
//   npm run json-impose -- 3         → seulement la 3e ligne
//   npm run json-impose -- "ma ligne" → une ligne de ton choix
//   npm run json-impose -- --fois 3  → les 7 lignes, 3 fois de suite (pour vérifier que la forme ne varie plus)

import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { LIGNES } from '../donnees/lignes.js';
import { PROMPT_JSON_IMPOSE } from '../prompts/journee.js';
import { SCHEMA_LIGNE } from '../schemas/ligne.js';

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: { fois: { type: 'string', default: '1' } },
});
// Quelles lignes lire ? Toutes, un numéro de ligne, ou un texte libre.
const argument = positionals.join(' ').trim();
const numero = Number(argument);
const lignes = !argument
  ? LIGNES
  : Number.isInteger(numero) && numero >= 1 && numero <= LIGNES.length
    ? [LIGNES[numero - 1]]
    : [argument];
const fois = Math.max(1, Number(options.fois) || 1);
const PAUSE_MS = 4000; // offre gratuite : 15 requêtes par minute

console.log(
  `Modèle : ${MODELE} · JSON IMPOSÉ par l'API (schéma) · température 0 · ${fois} passage(s)\n`,
);

let lisibles = 0;
let total = 0;
try {
  const ai = creerClient();

  for (let passage = 1; passage <= fois; passage += 1) {
    for (const [i, ligne] of lignes.entries()) {
      const reponse = await ai.models.generateContent({
        model: MODELE,
        contents: ligne,
        config: {
          temperature: 0,
          systemInstruction: PROMPT_JSON_IMPOSE,
          responseMimeType: 'application/json',
          responseJsonSchema: SCHEMA_LIGNE,
        },
      });
      total += 1;

      try {
        const objet = JSON.parse(reponse.text); // directement : aucune rustine
        lisibles += 1;
        if (passage === 1) {
          console.log(`[${i + 1}] ${ligne}`);
          for (const el of objet.elements) console.log(`    ✅ ${resumer(el)}`);
          console.log();
        }
      } catch (err) {
        console.log(
          `[passage ${passage} · ligne ${i + 1}] ❌ JSON.parse a échoué : ${err.message}`,
        );
        console.log(`    Texte brut reçu : ${JSON.stringify(reponse.text)}`);
      }

      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    if (fois > 1) console.log(`(passage ${passage}/${fois} terminé)`);
  }

  console.log(`--- ${lisibles}/${total} réponse(s) lisible(s) par JSON.parse ---`);
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}

// Affiche seulement les champs non nuls d'un élément, sur une ligne.
function resumer(element) {
  return Object.entries(element)
    .filter(([, valeur]) => valeur !== null)
    .map(([cle, valeur]) => `${cle}=${JSON.stringify(valeur)}`)
    .join(' ');
}
