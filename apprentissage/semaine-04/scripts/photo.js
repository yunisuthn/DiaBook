// Étape 1 : envoyer une IMAGE au modèle. Même extraireJournee() qu'en semaine 3, mais la page est une photo.
//
// Usage :
//   npm run photo                      → les 3 premières images (images/J01.png …)
//   npm run photo -- J04               → une image précise
//   npm run photo -- --toutes          → les 11 images (≈ 1 minute)
//   npm run photo -- --avec-texte      → lit aussi le TEXTE tapé de la même page, pour comparer les tokens
//   npm run photo -- --detail          → affiche aussi chaque élément lu

import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { extraireJournee, ErreurExtraction } from '../lib/extraction.js';
import { comparerAttendu } from '../lib/comparaison.js';
import { regrouper } from '../schemas/journee-zod.js';
import { JOURNEES } from '../donnees/journees.js';

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    toutes: { type: 'boolean', default: false },
    'avec-texte': { type: 'boolean', default: false },
    detail: { type: 'boolean', default: false },
  },
});

const choisies = positionals.length
  ? JOURNEES.filter((j) => positionals.includes(j.id))
  : options.toutes
    ? JOURNEES
    : JOURNEES.slice(0, 3);
const PAUSE_MS = 4000; // offre gratuite : 15 requêtes par minute
const pause = () => new Promise((r) => setTimeout(r, PAUSE_MS));

console.log(`Modèle : ${MODELE} · une photo = un appel (+ 1 relance si refusée) · température 0\n`);

// Lit une page (photo ou texte), affiche le résultat, et renvoie l'usage (ou null si refusée).
async function lire(ai, page, attendu) {
  try {
    const { journee, usage, appels, avertissements } = await extraireJournee(ai, page);
    const j = regrouper(journee);
    console.log(
      `   ✔ valide${appels > 1 ? ' après relance' : ''} · date ${j.date ?? '(non écrite)'} · ` +
        `${j.voyages.length} voyage(s) · ${j.depenses.length} dépense(s) · reste ${j.reste ?? '—'} · ` +
        `inconnus : ${j.inconnus.map((x) => x.texte).join(', ') || 'aucun'}`,
    );
    for (const a of avertissements) console.log(`   ⚠️  ${a.message} (${a.chemin})`);

    const ecarts = comparerAttendu(journee, attendu);
    if (ecarts.length === 0) console.log('   ✅ conforme à l’attendu');
    for (const e of ecarts) console.log(`   ≠ ${e.champ} : attendu ${e.attendu}, lu ${e.lu}`);

    if (options.detail) {
      for (const el of journee.elements) console.log(`     · ${JSON.stringify(el)}`);
    }
    return { usage, conforme: ecarts.length === 0 };
  } catch (err) {
    if (!(err instanceof ErreurExtraction)) throw err;
    console.log(`   ❌ ${err.message.replace(/\n/g, '\n      ')}`);
    return null;
  }
}

const bilan = { valides: 0, conformes: 0, entree: 0, image: 0, sortie: 0 };
try {
  const ai = creerClient();

  for (const [i, { id, texte, attendu }] of choisies.entries()) {
    const fichier = new URL(`../images/${id}.png`, import.meta.url);
    const image = await readFile(fichier);
    const { width, height } = await sharp(image).metadata();
    console.log(
      `=== ${id} · images/${id}.png (${width} × ${height} px, ${(image.length / 1024).toFixed(0)} Ko) ===`,
    );

    console.log('📷 photo');
    const r = await lire(ai, { image, mimeType: 'image/png' }, attendu);
    if (r) {
      bilan.valides += 1;
      if (r.conforme) bilan.conformes += 1;
      bilan.entree += r.usage.entree;
      bilan.image += r.usage.image;
      bilan.sortie += r.usage.sortie;
      console.log(
        `   tokens : entrée ${r.usage.entree} (dont image ${r.usage.image}), sortie ${r.usage.sortie}`,
      );
    }

    if (options['avec-texte']) {
      await pause();
      console.log('⌨️  texte tapé (semaine 3)');
      const t = await lire(ai, texte, attendu);
      if (t) console.log(`   tokens : entrée ${t.usage.entree}, sortie ${t.usage.sortie}`);
    }
    console.log();

    if (i < choisies.length - 1) await pause();
  }

  const n = choisies.length;
  console.log(
    `--- photos : ${bilan.valides}/${n} valide(s) · ${bilan.conformes}/${n} conforme(s) à l’attendu ---`,
  );
  console.log(
    `--- tokens : entrée ${bilan.entree} (dont images ${bilan.image}), sortie ${bilan.sortie} ---`,
  );
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('❌ Image introuvable : lance d’abord « npm run images ».');
  } else {
    console.error(`❌ ${expliquerErreur(err)}`);
  }
  process.exitCode = 1;
}
