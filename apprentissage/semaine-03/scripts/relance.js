// Étape 5 : voir la RELANCE à l'œuvre.
// Avec les 10 journées, le modèle répond presque toujours juste du premier coup : on ne verrait jamais la relance.
// Ce script la provoque :
//   1. hors ligne, avec un FAUX client qui renvoie des réponses écrites à la main ;
//   2. avec l'API, sur une page piégée : un voyage « Miandry vola » dont le montant n'est pas écrit.
//
// Usage :
//   npm run relance                  → démonstration hors ligne, puis la page piégée avec l'API
//   npm run relance -- --hors-ligne  → seulement la démonstration (aucun appel à l'API)

import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { extraireJournee, ErreurExtraction } from '../lib/extraction.js';
import { regrouper } from '../schemas/journee-zod.js';

const { values: options } = parseArgs({
  options: { 'hors-ligne': { type: 'boolean', default: false } },
});

// --- 1. Démonstration hors ligne --------------------------------------------------------------
// Un faux client : il a la même forme que le vrai (ai.models.generateContent), mais renvoie
// les réponses qu'on lui donne, dans l'ordre. Il garde ce qu'on lui a envoyé, pour l'afficher.
function creerFauxClient(reponses) {
  const envois = [];
  return {
    envois,
    models: {
      generateContent: async ({ contents }) => {
        envois.push(structuredClone(contents));
        return { text: JSON.stringify(reponses[envois.length - 1]), usageMetadata: {} };
      },
    },
  };
}

const PAGE = `29-09-26
* Gravillon 1vgs ④ Ambohipanja -> Ankadikely Frais 120000 - 50000
Reste 70000`;

const voyage = (montant, retenue) => ({
  type: 'voyage',
  numero: 4,
  quantite: 1,
  produit: 'gravillon',
  origine: 'Ambohipanja',
  destination: 'Ankadikely',
  montant,
  retenue,
  statut: 'paye',
});
const journee = (v) => ({
  date_ecrite: '29-09-26',
  date: '2026-09-29',
  elements: [v, { type: 'solde', montant: 70000 }],
});

// Montant et retenue inversés : la forme est bonne, mais Zod refuse (retenue > montant).
const FAUSSE = journee(voyage(50000, 120000));
const CORRIGEE = journee(voyage(120000, 50000));
// La « triche » vue en vrai : le voyage devient un élément inconnu, et Zod n'a plus rien à refuser.
const TRICHEE = journee({ type: 'inconnu', texte: 'Gravillon 1vgs ④', montant: null });

async function demonstration() {
  console.log('=== 1. Hors ligne : la 1re réponse est refusée, la relance la corrige ===\n');
  const ai = creerFauxClient([FAUSSE, CORRIGEE]);
  const { journee: j, appels } = await extraireJournee(ai, PAGE);

  // Ce qui a été envoyé au 2e appel : toute la conversation.
  console.log(`Conversation envoyée au 2e appel (${ai.envois[1].length} messages) :`);
  for (const { role, parts } of ai.envois[1]) {
    console.log(`\n[${role}]\n${parts[0].text.replace(/^/gm, '   ')}`);
  }
  const v = regrouper(j).voyages[0];
  console.log(`\n→ ✔ valide après ${appels} appels : montant ${v.montant}, retenue ${v.retenue}\n`);

  console.log('=== 2. Hors ligne : refusée deux fois → on abandonne et on signale ===\n');
  try {
    await extraireJournee(creerFauxClient([FAUSSE, FAUSSE]), PAGE);
  } catch (err) {
    if (!(err instanceof ErreurExtraction)) throw err;
    console.log(`❌ ${err.message}`);
    console.log(
      `   err.tentatives : ${err.tentatives.length} réponses brutes gardées pour l’utilisateur\n`,
    );
  }

  console.log(
    '=== 3. Hors ligne : la relance fait disparaître le voyage → le garde-fou refuse ===\n',
  );
  try {
    await extraireJournee(creerFauxClient([FAUSSE, TRICHEE]), PAGE);
  } catch (err) {
    if (!(err instanceof ErreurExtraction)) throw err;
    console.log(`❌ ${err.message}\n`);
  }
}

// --- 2. Avec l'API : une page piégée -----------------------------------------------------------
// Le voyage ⑭ est « Miandry vola » (en attente), mais le receveur n'a pas écrit le montant.
// Avant l'étape 5, Zod refusait (règle de l'exercice de l'étape 3) et, à la relance, le modèle
// changeait le voyage en élément « inconnu » pour passer. Maintenant : accepté du premier coup,
// le montant reste null, avec un avertissement.
const PAGE_PIEGEE = `10-10-26
* Biriky 1vgs ⑬ Manandriana -> Itaosy Frais 95000
* Fasika 1vgs ⑭ Ampasika -> Ivato Miandry vola
Sakafo 12000
Reste vola 83000`;

async function pagePiegee() {
  console.log(`=== 4. Avec l'API (${MODELE}) : un voyage en attente sans montant ===\n`);
  console.log(`${PAGE_PIEGEE.replace(/^/gm, '   ')}\n`);
  const ai = creerClient();
  try {
    const {
      journee: j,
      appels,
      tentatives,
      avertissements,
    } = await extraireJournee(ai, PAGE_PIEGEE);
    for (const t of tentatives)
      console.log(`↻ refusée, relance :\n${t.erreur.replace(/^/gm, '   ')}`);
    console.log(`✔ valide après ${appels} appel(s). Réponse acceptée :`);
    for (const el of j.elements) console.log(`   · ${JSON.stringify(el)}`);
    for (const a of avertissements) console.log(`⚠️  ${a.message} (${a.chemin})`);
    // Ce qu'il faut regarder : le voyage ⑭ est-il encore un voyage ? A-t-il un montant inventé ?
    const g = regrouper(j);
    console.log(
      `   → ${g.voyages.length} voyage(s) sur les 2 écrits · inconnus : ${g.inconnus.length}`,
    );
  } catch (err) {
    if (!(err instanceof ErreurExtraction)) throw err;
    console.log(`❌ ${err.message.replace(/\n/g, '\n   ')}`);
    console.log('   → à signaler : l’utilisateur doit relire cette page.');
  }
}

try {
  await demonstration();
  if (!options['hors-ligne']) await pagePiegee();
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}
