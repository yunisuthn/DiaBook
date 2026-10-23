// Étape 1 : fabrique une IMAGE de chaque journée inventée (donnees/journees.js), avec sharp.
// Ce n'est pas encore de l'écriture à la main : c'est du texte tapé, dessiné sur une page lignée.
// But : une première image propre et sans données réelles, pour apprendre à envoyer une image au modèle.
// Les vraies photos manuscrites viendront à l'étape 3.
//
// Usage :
//   npm run images   → images/J01.png … images/J11.png

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JOURNEES } from '../donnees/journees.js';

const TAILLE = 42; // taille du texte, en pixels
const INTERLIGNE = 70; // distance entre deux lignes du cahier, en pixels
const MARGE = 60;
// Largeur moyenne d'un caractère de DejaVu Sans ≈ 0,62 × la taille (un peu large, par sécurité).
// Sans ça, une ligne longue serait coupée au bord de l'image… et le modèle ne pourrait pas la lire.
const largeurDe = (lignes) =>
  MARGE * 2 + Math.ceil(Math.max(...lignes.map((l) => l.length)) * TAILLE * 0.62);

// Le texte va dans du SVG (du XML) : il faut échapper &, < et > (« -> » contient un >).
const echapper = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Une page de cahier en SVG : fond crème, lignes bleu pâle, texte à l'encre bleue.
function pageSVG(texte) {
  const lignes = texte.split('\n');
  const largeur = largeurDe(lignes);
  const hauteur = MARGE * 2 + (lignes.length + 1) * INTERLIGNE;

  const reglure = Array.from({ length: lignes.length + 1 }, (_, i) => {
    const y = MARGE + (i + 1) * INTERLIGNE + 12;
    return `<line x1="0" y1="${y}" x2="${largeur}" y2="${y}" stroke="#b9d3ee" stroke-width="2"/>`;
  }).join('\n');

  const ecriture = lignes
    .map((ligne, i) => {
      const y = MARGE + (i + 1) * INTERLIGNE;
      return `<text x="${MARGE}" y="${y}">${echapper(ligne)}</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">
  <rect width="100%" height="100%" fill="#fbf8ef"/>
  ${reglure}
  <g font-family="DejaVu Sans" font-size="${TAILLE}" fill="#1d3f8f">
  ${ecriture}
  </g>
</svg>`;
}

const dossier = new URL('../images/', import.meta.url);
await mkdir(dossier, { recursive: true });

for (const { id, texte } of JOURNEES) {
  const fichier = new URL(`${id}.png`, dossier);
  // sharp sait lire du SVG : il le « dessine » en pixels, puis on enregistre en PNG.
  const info = await sharp(Buffer.from(pageSVG(texte)))
    .png()
    .toFile(fileURLToPath(fichier)); // sharp attend un chemin, pas une URL
  console.log(
    `images/${id}.png  ${info.width} × ${info.height} px  ${(info.size / 1024).toFixed(0)} Ko`,
  );
}
