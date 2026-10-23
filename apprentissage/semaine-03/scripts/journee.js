// Étapes 4 et 5 : lit des journées ENTIÈRES (une page = un appel) avec extraireJournee().
// Étape 5 : une réponse refusée est relancée une fois, et chaque journée est comparée à son « attendu ».
//
// Usage :
//   npm run journee              → les 3 premières journées de donnees/journees.js
//   npm run journee -- J05       → une journée précise
//   npm run journee -- --toutes  → toutes les journées (≈ 1 minute)
//   npm run journee -- --detail  → affiche aussi chaque élément

import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { extraireJournee, ErreurExtraction } from '../lib/extraction.js';
import { comparerAttendu } from '../lib/comparaison.js';
import { regrouper } from '../schemas/journee-zod.js';
import { JOURNEES } from '../donnees/journees.js';

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    toutes: { type: 'boolean', default: false },
    detail: { type: 'boolean', default: false },
  },
});

const choisies = positionals.length
  ? JOURNEES.filter((j) => positionals.includes(j.id))
  : options.toutes
    ? JOURNEES
    : JOURNEES.slice(0, 3);
const PAUSE_MS = 4000; // offre gratuite : 15 requêtes par minute

console.log(
  `Modèle : ${MODELE} · une journée = un appel (+ 1 relance si refusée) · température 0\n`,
);

// Le bilan : combien de journées valides du premier coup, après relance, refusées ; combien conformes.
const bilan = { premierCoup: 0, apresRelance: 0, refusees: 0, conformes: 0, entree: 0, sortie: 0 };
try {
  const ai = creerClient();

  for (const [i, { id, texte, attendu }] of choisies.entries()) {
    console.log(`=== ${id} (${texte.split('\n').length} lignes) ===`);
    try {
      const { journee, usage, appels, tentatives, avertissements } = await extraireJournee(
        ai,
        texte,
      );
      bilan.entree += usage.entree;
      bilan.sortie += usage.sortie;
      if (appels === 1) bilan.premierCoup += 1;
      else bilan.apresRelance += 1;

      for (const t of tentatives) {
        console.log(
          `↻ réponse refusée, relance avec l’erreur :\n${t.erreur.replace(/^/gm, '   ')}`,
        );
      }

      const j = regrouper(journee);
      console.log(
        `✔ JSON valide${appels > 1 ? ' après relance' : ''} · date ${j.date ?? '(non écrite)'} · ` +
          `${j.voyages.length} voyage(s) · ${j.depenses.length} dépense(s) · ` +
          `${j.mouvements.length} mouvement(s) · reste ${j.reste ?? '—'} · ` +
          `inconnus : ${j.inconnus.map((x) => x.texte).join(', ') || 'aucun'}`,
      );

      for (const a of avertissements) console.log(`⚠️  ${a.message} (${a.chemin})`);

      const ecarts = comparerAttendu(journee, attendu);
      if (ecarts.length === 0) {
        bilan.conformes += 1;
        console.log('✅ conforme à l’attendu');
      } else {
        for (const e of ecarts) {
          console.log(`≠ ${e.champ} : attendu ${e.attendu}, lu ${e.lu}`);
        }
      }

      console.log(
        `   tokens : entrée ${usage.entree}, sortie ${usage.sortie} (${appels} appel(s))`,
      );
      if (options.detail) {
        for (const el of journee.elements) console.log(`   · ${JSON.stringify(el)}`);
      }
    } catch (err) {
      if (!(err instanceof ErreurExtraction)) throw err;
      bilan.refusees += 1;
      console.log(`❌ ${err.message.replace(/\n/g, '\n   ')}`);
      console.log('   → à signaler : l’utilisateur doit relire cette page.');
    }
    console.log();

    if (i < choisies.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  const n = choisies.length;
  console.log(
    `--- ${bilan.premierCoup + bilan.apresRelance}/${n} JSON valide(s) ` +
      `(${bilan.premierCoup} du premier coup, ${bilan.apresRelance} après relance, ${bilan.refusees} refusée(s)) · ` +
      `${bilan.conformes}/${n} conforme(s) à l’attendu ---`,
  );
  console.log(`--- tokens : entrée ${bilan.entree}, sortie ${bilan.sortie} ---`);
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}
