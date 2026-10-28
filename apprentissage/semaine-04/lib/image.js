// Étape 2 : préparer une photo AVANT de l'envoyer au modèle, avec sharp.
//
// Ce qu'on a mesuré (02-cout-d-une-image.md) :
//   - chez Gemini, le prix d'une image ne dépend PAS de sa taille en pixels, mais de la « résolution » demandée
//     (LOW ≈ 260 tokens, MEDIUM ≈ 550, HIGH ≈ 1 080) : le modèle ramène toute image à ce budget ;
//   - donc ce qui compte, c'est la part de l'image occupée par l'ÉCRITURE : une page prise de loin perd
//     ses chiffres en LOW, la même page recadrée est lue sans erreur.
//
// D'où les trois opérations, dans cet ordre :
//   1. rotate()  : redresse la photo selon son étiquette EXIF (un téléphone enregistre souvent l'image couchée,
//                  avec une étiquette « à tourner de 90° ») ;
//   2. trim()    : recadre en enlevant le bord uniforme autour de la page (fond d'une couleur unie) ;
//   3. resize()  : limite le grand côté à COTE_MAX pixels. Ça ne change pas le prix chez Gemini, mais le fichier est
//                  bien plus léger (envoi plus rapide, moins de stockage), et chez Claude le prix dépend des pixels.

import sharp from 'sharp';

export const COTE_MAX = 1600;

// entree : Buffer de l'image d'origine (PNG, JPEG…). Renvoie { image, mimeType, largeur, hauteur }.
export async function preparerImage(entree, { coteMax = COTE_MAX } = {}) {
  const { data, info } = await sharp(entree)
    .rotate()
    .trim()
    .resize({ width: coteMax, height: coteMax, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true });

  return { image: data, mimeType: 'image/jpeg', largeur: info.width, hauteur: info.height };
}
