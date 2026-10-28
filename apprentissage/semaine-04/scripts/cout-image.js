// Étape 2 : ce que coûte une image, et ce que change la préparation (lib/image.js).
//
//   1. Le prix selon la taille en pixels : la même page à 6 tailles, comptée avec countTokens (aucune génération).
//   2. Une page prise DE LOIN : elle n'occupe qu'un coin d'une grande photo. Lue en LOW telle quelle,
//      en LOW après préparation (recadrée), puis en HIGH telle quelle.
//   3. Le poids du fichier (hors ligne) : PNG, JPEG, puis image préparée, et ce que ça donne en base64.
//
// Usage :
//   npm run cout-image                  → les 3 parties (≈ 4 appels à l'API)
//   npm run cout-image -- --hors-ligne  → seulement la partie 3

import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { extraireJournee, ErreurExtraction } from '../lib/extraction.js';
import { comparerNombres } from '../lib/comparaison.js';
import { preparerImage } from '../lib/image.js';
import { JOURNEES } from '../donnees/journees.js';

const { values: options } = parseArgs({
  options: { 'hors-ligne': { type: 'boolean', default: false } },
});

const PAUSE_MS = 4500; // offre gratuite : 15 requêtes par minute
const pause = () => new Promise((r) => setTimeout(r, PAUSE_MS));
const ko = (octets) => `${Math.round(octets / 1024)} Ko`.padStart(8);

const J07 = JOURNEES.find((j) => j.id === 'J07'); // la page la plus longue (7 lignes, 8 montants)
const image = await readFile(new URL('../images/J07.png', import.meta.url));

// Une « photo prise de loin » : la page réduite à 500 px de large, posée au milieu d'un fond uni de 4000 × 3000 px
// (la table). C'est la taille d'une photo de téléphone ; la page n'en occupe que 1/8 de la largeur.
const page500 = await sharp(image).resize({ width: 500 }).png().toBuffer();
const deLoin = await sharp({
  create: { width: 4000, height: 3000, channels: 3, background: '#8a6d4b' },
})
  .composite([{ input: page500, left: 1700, top: 1400 }])
  .png()
  .toBuffer();

// --- 1. Le prix selon la taille ----------------------------------------------------------------------
async function prixSelonLaTaille(ai) {
  console.log(`=== 1. La même page (J07) à 6 tailles · countTokens (${MODELE}) ===\n`);
  for (const largeur of [3600, 1683, 800, 384, 128, 64]) {
    const png = await sharp(image).resize({ width: largeur }).png().toBuffer();
    const { height } = await sharp(png).metadata();
    const { totalTokens } = await ai.models.countTokens({
      model: MODELE,
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType: 'image/png', data: png.toString('base64') } }],
        },
      ],
    });
    console.log(
      `   ${`${largeur} × ${height} px`.padEnd(16)} ${ko(png.length)}   → ${totalTokens} tokens`,
    );
  }
  console.log();
}

// --- 2. Une page prise de loin -----------------------------------------------------------------------
async function lireDeLoin(ai) {
  console.log(
    '=== 2. Une page prise de loin (500 px de large dans une photo de 4000 × 3000) ===\n',
  );
  const preparee = await preparerImage(deLoin);
  const essais = [
    ['LOW, telle quelle', { image: deLoin, mimeType: 'image/png' }, 'MEDIA_RESOLUTION_LOW'],
    [`LOW, préparée (${preparee.largeur} × ${preparee.hauteur})`, preparee, 'MEDIA_RESOLUTION_LOW'],
    ['HIGH, telle quelle', { image: deLoin, mimeType: 'image/png' }, 'MEDIA_RESOLUTION_HIGH'],
  ];
  for (const [i, [titre, page, resolution]] of essais.entries()) {
    try {
      const { journee, usage } = await extraireJournee(ai, page, { resolution });
      const nombres = comparerNombres(journee, J07.texte);
      console.log(
        `   ${titre.padEnd(30)} image ${String(usage.image).padStart(4)} tokens · ` +
          (nombres
            ? `❌ nombres faux : page [${nombres.manquants}] → lu [${nombres.enTrop}]`
            : '✅ tous les nombres lus'),
      );
    } catch (err) {
      if (!(err instanceof ErreurExtraction)) throw err;
      console.log(`   ${titre.padEnd(30)} ❌ ${err.message.split('\n')[0]}`);
    }
    if (i < essais.length - 1) await pause();
  }
  console.log();
}

// --- 3. Le poids du fichier --------------------------------------------------------------------------
async function poidsDuFichier() {
  console.log('=== 3. Le poids du fichier (la photo prise de loin, 4000 × 3000) ===\n');
  const jpeg = await sharp(deLoin).jpeg({ quality: 85 }).toBuffer();
  const preparee = await preparerImage(deLoin);
  // base64 : 4 caractères pour 3 octets → le texte envoyé est ≈ 1,33 fois plus lourd que le fichier.
  const lignes = [
    ['PNG 4000 × 3000', deLoin],
    ['JPEG 4000 × 3000 (qualité 85)', jpeg],
    [`préparée ${preparee.largeur} × ${preparee.hauteur} (JPEG)`, preparee.image],
  ];
  for (const [titre, octets] of lignes) {
    const base64 = Math.ceil(octets.length / 3) * 4;
    console.log(`   ${titre.padEnd(32)} fichier ${ko(octets.length)} · en base64 ${ko(base64)}`);
  }
  console.log();
}

try {
  if (!options['hors-ligne']) {
    const ai = creerClient();
    await prixSelonLaTaille(ai);
    await lireDeLoin(ai);
  }
  await poidsDuFichier();
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('❌ Image introuvable : lance d’abord « npm run images ».');
  } else {
    console.error(`❌ ${expliquerErreur(err)}`);
  }
  process.exitCode = 1;
}
