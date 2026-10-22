// Étape 4 : lit des journées ENTIÈRES (une page = un appel) avec extraireJournee().
//
// Usage :
//   npm run journee              → les 3 premières journées de donnees/journees.js
//   npm run journee -- J05       → une journée précise
//   npm run journee -- --toutes  → les 10 journées (≈ 1 minute)
//   npm run journee -- --detail  → affiche aussi chaque élément

import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { extraireJournee, ErreurExtraction } from '../lib/extraction.js';
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

console.log(`Modèle : ${MODELE} · une journée = un appel · température 0\n`);

const total = { entree: 0, sortie: 0, valides: 0 };
try {
  const ai = creerClient();

  for (const [i, { id, texte, attendu }] of choisies.entries()) {
    console.log(`=== ${id} (${texte.split('\n').length} lignes) ===`);
    try {
      const { journee, usage } = await extraireJournee(ai, texte);
      total.valides += 1;
      total.entree += usage.entree;
      total.sortie += usage.sortie;

      const j = regrouper(journee);
      console.log(
        `✅ date ${j.date ?? '(non écrite)'} · ${j.voyages.length} voyage(s) · ` +
          `${j.depenses.length} dépense(s) · ${j.mouvements.length} mouvement(s) · ` +
          `reste ${j.reste ?? '—'} · inconnus : ${j.inconnus.map((x) => x.texte).join(', ') || 'aucun'}`,
      );
      console.log(`   attendu : ${JSON.stringify(attendu)}`);
      console.log(`   tokens : entrée ${usage.entree}, sortie ${usage.sortie}`);
      if (options.detail) {
        for (const el of journee.elements) console.log(`   · ${JSON.stringify(el)}`);
      }
    } catch (err) {
      if (!(err instanceof ErreurExtraction)) throw err;
      console.log(`❌ réponse refusée :\n${err.message.replace(/^/gm, '   ')}`);
    }
    console.log();

    if (i < choisies.length - 1) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  console.log(
    `--- ${total.valides}/${choisies.length} journée(s) valide(s) · ` +
      `entrée ${total.entree} tokens · sortie ${total.sortie} tokens ---`,
  );
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}
