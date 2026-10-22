// Étape 3 : un seul schéma Zod (schemas/ligne-zod.js) qui sert deux fois :
//   - converti en JSON Schema pour l'API → la FORME de la réponse est imposée ;
//   - LigneSchema.safeParse() dans notre code → le CONTENU est vérifié (règles métier comprises).
//
// Usage :
//   npm run json-valide                  → démonstration hors ligne, puis les 7 lignes avec l'API
//   npm run json-valide -- --hors-ligne  → seulement la démonstration (aucun appel à l'API)
//   npm run json-valide -- 3             → démonstration, puis la 3e ligne seulement

import { parseArgs } from 'node:util';
import { z } from 'zod';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { LIGNES } from '../donnees/lignes.js';
import { PROMPT_JSON_IMPOSE } from '../prompts/journee.js';
import { LigneSchema, SCHEMA_LIGNE_POUR_API } from '../schemas/ligne-zod.js';

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'hors-ligne': { type: 'boolean', default: false } },
});

// --- 1. Démonstration hors ligne : ce que Zod attrape ---------------------------------------
// Des réponses FAUSSES écrites à la main, pour voir les messages d'erreur de Zod.
const REPONSES_FAUSSES = [
  {
    titre: 'montant écrit en texte',
    objet: { elements: [{ type: 'depense', nature: 'repas', montant: '12 000' }] },
  },
  {
    titre: 'statut qui n’existe pas',
    objet: {
      elements: [
        {
          type: 'voyage',
          numero: 8,
          quantite: 1,
          produit: 'brique',
          origine: 'A',
          destination: 'B',
          montant: null,
          retenue: null,
          statut: 'gratuit',
        },
      ],
    },
  },
  {
    titre: 'voyage payé sans montant (règle métier)',
    objet: {
      elements: [
        {
          type: 'voyage',
          numero: 7,
          quantite: 2,
          produit: 'sable',
          origine: 'A',
          destination: 'B',
          montant: null,
          retenue: null,
          statut: 'paye',
        },
      ],
    },
  },
  {
    titre: 'retenue plus grande que le montant (règle métier)',
    objet: {
      elements: [
        {
          type: 'voyage',
          numero: 7,
          quantite: 2,
          produit: 'sable',
          origine: 'A',
          destination: 'B',
          montant: 50000,
          retenue: 120000,
          statut: 'paye',
        },
      ],
    },
  },
];

console.log('=== 1. Ce que Zod attrape (réponses fausses écrites à la main) ===\n');
for (const { titre, objet } of REPONSES_FAUSSES) {
  // safeParse ne lance pas d'exception : il renvoie { success: true, data } ou { success: false, error }.
  const resultat = LigneSchema.safeParse(objet);
  console.log(`• ${titre} → ${resultat.success ? '✅ accepté' : '❌ refusé'}`);
  if (!resultat.success) console.log(indenter(z.prettifyError(resultat.error)));
  console.log();
}

if (options['hors-ligne']) process.exit(0);

// --- 2. Les vraies réponses du modèle, imposées par le schéma, puis vérifiées par Zod --------
const numero = Number(positionals[0]);
const lignes = Number.isInteger(numero) && numero >= 1 ? [LIGNES[numero - 1]] : LIGNES;
const PAUSE_MS = 4000; // offre gratuite : 15 requêtes par minute

console.log(`=== 2. Réponses de ${MODELE} (schéma Zod imposé à l'API, puis safeParse) ===\n`);

let valides = 0;
try {
  const ai = creerClient();

  for (const [i, ligne] of lignes.entries()) {
    const reponse = await ai.models.generateContent({
      model: MODELE,
      contents: ligne,
      config: {
        temperature: 0,
        systemInstruction: PROMPT_JSON_IMPOSE,
        responseMimeType: 'application/json',
        responseJsonSchema: SCHEMA_LIGNE_POUR_API, // généré à partir du schéma Zod
      },
    });

    const resultat = LigneSchema.safeParse(JSON.parse(reponse.text));
    console.log(`[${i + 1}] ${ligne}`);
    if (resultat.success) {
      valides += 1;
      // resultat.data : l'objet validé, qu'on peut utiliser en toute confiance.
      for (const el of resultat.data.elements) console.log(`    ✅ ${JSON.stringify(el)}`);
    } else {
      console.log(`    ❌ refusé par Zod :\n${indenter(z.prettifyError(resultat.error), 6)}`);
    }
    console.log();

    if (i < lignes.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  console.log(`--- ${valides}/${lignes.length} réponse(s) valide(s) selon Zod ---`);
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}

function indenter(texte, espaces = 4) {
  return texte.replace(/^/gm, ' '.repeat(espaces));
}
