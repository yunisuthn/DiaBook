import sharp from 'sharp';

/** Plus grand côté des photos conservées, en pixels. */
export const COTE_MAX = 1600;

export interface ImagePretraitee {
  jpeg: Buffer;
  largeur: number;
  hauteur: number;
  /** dHash 64 bits, 16 caractères hexadécimaux */
  hash: string;
}

/**
 * Prépare une photo de page pour le stockage et la lecture par l'IA :
 * rotation selon l'EXIF, 1600 px au plus (sans agrandir), contraste normalisé, JPEG qualité 85.
 * Rejette si l'image n'est pas décodable (fichier corrompu, HEIC non pris en charge…).
 */
export async function pretraiterImage(entree: Buffer): Promise<ImagePretraitee> {
  const { data, info } = await sharp(entree, { failOn: 'error' })
    .rotate()
    .resize({ width: COTE_MAX, height: COTE_MAX, fit: 'inside', withoutEnlargement: true })
    .normalize()
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { jpeg: data, largeur: info.width, hauteur: info.height, hash: await calculerDhash(data) };
}

/**
 * dHash (« difference hash ») : image réduite à 9×8 en niveaux de gris, chaque bit dit si un pixel
 * est plus clair que son voisin de droite. Deux photos de la même page donnent des hash proches.
 */
export async function calculerDhash(image: Buffer): Promise<string> {
  const pixels = await sharp(image).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = 0n;
  for (let ligne = 0; ligne < 8; ligne++) {
    for (let colonne = 0; colonne < 8; colonne++) {
      const gauche = pixels[ligne * 9 + colonne] ?? 0;
      const droite = pixels[ligne * 9 + colonne + 1] ?? 0;
      bits = (bits << 1n) | (gauche > droite ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, '0');
}

/** Nombre de bits différents entre deux hash hexadécimaux de 64 bits. */
export function distanceHamming(hashA: string, hashB: string): number {
  let difference = BigInt(`0x${hashA}`) ^ BigInt(`0x${hashB}`);
  let distance = 0;
  while (difference > 0n) {
    distance += Number(difference & 1n);
    difference >>= 1n;
  }
  return distance;
}
