import sharp from 'sharp';

/**
 * Image JPEG de test : un motif aléatoire 18×16 agrandi, propre à chaque graine.
 * Deux graines différentes donnent des images (et des dHash) très différentes.
 */
export async function imageDeTest(
  graine: number,
  { largeur = 1200, hauteur = 900, qualite = 90 } = {},
): Promise<Buffer> {
  let etat = graine;
  const aleatoire = () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
  const motif = Buffer.alloc(18 * 16);
  for (let i = 0; i < motif.length; i++) motif[i] = Math.floor(aleatoire() * 256);
  return sharp(motif, { raw: { width: 18, height: 16, channels: 1 } })
    .resize(largeur, hauteur, { kernel: 'cubic' })
    .jpeg({ quality: qualite })
    .toBuffer();
}
