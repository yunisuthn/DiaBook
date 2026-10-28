// Étape 1 : envoyer une IMAGE au modèle. Même extraireJournee() qu'en semaine 3, mais la page est une photo.
// Étape 2 : choisir la résolution, préparer l'image avec sharp, et vérifier TOUS les nombres lus.
//
// Usage :
//   npm run photo                      → les 3 premières images (images/J01.png …)
//   npm run photo -- J04               → une image précise
//   npm run photo -- --toutes          → les 11 images (≈ 1 minute)
//   npm run photo -- --avec-texte      → lit aussi le TEXTE tapé de la même page, pour comparer les tokens
//   npm run photo -- --detail          → affiche aussi chaque élément lu
//   npm run photo -- --resolution low  → résolution LOW, MEDIUM ou HIGH (par défaut : le choix du modèle)
//   npm run photo -- --preparer        → prépare l'image avant l'envoi (lib/image.js : rotation, recadrage, taille)

import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { extraireJournee, ErreurExtraction } from '../lib/extraction.js';
import { comparerAttendu, comparerNombres } from '../lib/comparaison.js';
import { preparerImage } from '../lib/image.js';
import { regrouper } from '../schemas/journee-zod.js';
import { JOURNEES } from '../donnees/journees.js';

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    toutes: { type: 'boolean', default: false },
    'avec-texte': { type: 'boolean', default: false },
    detail: { type: 'boolean', default: false },
    resolution: { type: 'string' },
    preparer: { type: 'boolean', default: false },
  },
});

const RESOLUTIONS = {
  low: 'MEDIA_RESOLUTION_LOW',
  medium: 'MEDIA_RESOLUTION_MEDIUM',
  high: 'MEDIA_RESOLUTION_HIGH',
};
const resolution = options.resolution && RESOLUTIONS[options.resolution.toLowerCase()];
if (options.resolution && !resolution) {
  console.error(`❌ --resolution : low, medium ou high (reçu « ${options.resolution} »).`);
  process.exit(1);
}

const choisies = positionals.length
  ? JOURNEES.filter((j) => positionals.includes(j.id))
  : options.toutes
    ? JOURNEES
    : JOURNEES.slice(0, 3);
const PAUSE_MS = 4000; // offre gratuite : 15 requêtes par minute
const pause = () => new Promise((r) => setTimeout(r, PAUSE_MS));

console.log(
  `Modèle : ${MODELE} · une photo = un appel (+ 1 relance si refusée) · température 0 · ` +
    `résolution ${options.resolution ?? 'par défaut'}${options.preparer ? ' · image préparée' : ''}\n`,
);

// Lit une page (photo ou texte), affiche le résultat, et renvoie l'usage (ou null si refusée).
// « texte » : le texte tapé de la page, pour vérifier que tous ses nombres ont été lus.
async function lire(ai, page, { attendu, texte }) {
  try {
    const { journee, usage, appels, avertissements } = await extraireJournee(ai, page, {
      resolution,
    });
    const j = regrouper(journee);
    console.log(
      `   ✔ valide${appels > 1 ? ' après relance' : ''} · date ${j.date ?? '(non écrite)'} · ` +
        `${j.voyages.length} voyage(s) · ${j.depenses.length} dépense(s) · reste ${j.reste ?? '—'} · ` +
        `inconnus : ${j.inconnus.map((x) => x.texte).join(', ') || 'aucun'}`,
    );
    for (const a of avertissements) console.log(`   ⚠️  ${a.message} (${a.chemin})`);

    const ecarts = comparerAttendu(journee, attendu);
    for (const e of ecarts) console.log(`   ≠ ${e.champ} : attendu ${e.attendu}, lu ${e.lu}`);
    // Étape 2 : les compteurs ne voient pas un montant mal lu ; on compare aussi tous les nombres.
    const nombres = comparerNombres(journee, texte);
    if (nombres) {
      console.log(
        `   ≠ nombres : sur la page sans être lus [${nombres.manquants}], lus sans être sur la page [${nombres.enTrop}]`,
      );
    }
    const conforme = ecarts.length === 0 && !nombres;
    if (conforme) console.log('   ✅ conforme à l’attendu, tous les nombres lus');

    if (options.detail) {
      for (const el of journee.elements) console.log(`     · ${JSON.stringify(el)}`);
    }
    return { usage, conforme };
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
    const brute = await readFile(fichier);
    const { width, height } = await sharp(brute).metadata();
    console.log(
      `=== ${id} · images/${id}.png (${width} × ${height} px, ${(brute.length / 1024).toFixed(0)} Ko) ===`,
    );

    let page = { image: brute, mimeType: 'image/png' };
    if (options.preparer) {
      page = await preparerImage(brute);
      console.log(
        `   préparée : ${page.largeur} × ${page.hauteur} px, ${(page.image.length / 1024).toFixed(0)} Ko (JPEG)`,
      );
    }

    console.log('📷 photo');
    const r = await lire(ai, page, { attendu, texte });
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
      const t = await lire(ai, texte, { attendu, texte });
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
