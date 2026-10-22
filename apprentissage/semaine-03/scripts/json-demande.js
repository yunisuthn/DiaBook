// Étape 1 : on DEMANDE au modèle de répondre en JSON (dans le prompt), puis on essaie de le lire avec JSON.parse.
// Objectif : voir ce qui peut casser quand rien ne garantit la forme de la réponse.
//
// Usage :
//   npm run json-demande          → les 7 lignes de test
//   npm run json-demande -- 3     → seulement la 3e ligne

import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { LIGNES } from '../donnees/lignes.js';
import { PROMPT_JSON_DEMANDE } from '../prompts/journee.js';

const numero = Number(process.argv[2]);
const lignes = Number.isInteger(numero) && numero >= 1 ? [LIGNES[numero - 1]] : LIGNES;
const PAUSE_MS = 4000; // offre gratuite : 15 requêtes par minute

console.log(`Modèle : ${MODELE} · JSON demandé dans le prompt · température 0\n`);

let lisibles = 0;
try {
  const ai = creerClient();

  for (const [i, ligne] of lignes.entries()) {
    const reponse = await ai.models.generateContent({
      model: MODELE,
      contents: ligne,
      config: { temperature: 0, systemInstruction: PROMPT_JSON_DEMANDE },
    });
    const texte = reponse.text ?? '';

    console.log(`[${i + 1}] ${ligne}`);
    console.log(`    Texte brut reçu : ${JSON.stringify(texte)}`);

    // JSON.parse transforme un texte en objet JavaScript… s'il est EXACTEMENT du JSON valide.
    try {
      const objet = JSON.parse(texte);
      lisibles += 1;
      console.log('    ✅ JSON.parse a réussi :');
      console.log(`    ${JSON.stringify(objet)}`);
      for (const probleme of verifier(objet)) console.log(`    ⚠️  ${probleme}`);
    } catch (err) {
      console.log(`    ❌ JSON.parse a échoué : ${err.message}`);
    }
    console.log();

    if (i < lignes.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  console.log(`--- ${lisibles}/${lignes.length} réponse(s) lisible(s) par JSON.parse ---`);
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}

// Même quand le texte est du JSON valide, son CONTENU peut ne pas respecter ce qu'on a demandé.
function verifier(objet) {
  const problemes = [];
  if (!Array.isArray(objet?.elements)) return ['pas de tableau « elements »'];
  for (const el of objet.elements) {
    if ('montant' in el && el.montant !== null && !Number.isInteger(el.montant)) {
      problemes.push(`montant qui n'est pas un nombre entier : ${JSON.stringify(el.montant)}`);
    }
    if (el.type === 'voyage' && !['paye', 'paye_maison', 'en_attente'].includes(el.statut)) {
      problemes.push(`statut inattendu : ${JSON.stringify(el.statut)}`);
    }
  }
  return problemes;
}
