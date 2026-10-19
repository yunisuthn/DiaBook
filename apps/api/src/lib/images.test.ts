import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { imageDeTest } from '../test-utils/images.js';
import { calculerDhash, distanceHamming, pretraiterImage } from './images.js';

describe('pretraiterImage', () => {
  it('réduit à 1600 px au plus et produit un JPEG', async () => {
    const resultat = await pretraiterImage(await imageDeTest(1, { largeur: 4000, hauteur: 3000 }));
    expect(resultat).toMatchObject({ largeur: 1600, hauteur: 1200 });
    expect((await sharp(resultat.jpeg).metadata()).format).toBe('jpeg');
    expect(resultat.hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('n’agrandit pas une petite photo', async () => {
    const resultat = await pretraiterImage(await imageDeTest(1, { largeur: 800, hauteur: 600 }));
    expect(resultat).toMatchObject({ largeur: 800, hauteur: 600 });
  });

  it('applique la rotation EXIF (photo prise téléphone tourné)', async () => {
    const paysage = await imageDeTest(1, { largeur: 1200, hauteur: 800 });
    const tournee = await sharp(paysage).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const resultat = await pretraiterImage(tournee);
    expect(resultat).toMatchObject({ largeur: 800, hauteur: 1200 });
  });

  it('accepte le PNG', async () => {
    const png = await sharp(await imageDeTest(3))
      .png()
      .toBuffer();
    await expect(pretraiterImage(png)).resolves.toMatchObject({ largeur: 1200 });
  });

  it('rejette un fichier qui n’est pas une image', async () => {
    await expect(pretraiterImage(Buffer.from('pas une image'))).rejects.toThrow();
  });
});

describe('dHash', () => {
  it('donne des hash proches pour la même page réencodée', async () => {
    const original = await calculerDhash(await imageDeTest(7, { qualite: 95 }));
    const recompressee = await calculerDhash(
      await imageDeTest(7, { qualite: 40, largeur: 900, hauteur: 675 }),
    );
    expect(distanceHamming(original, recompressee)).toBeLessThanOrEqual(5);
  });

  it('donne des hash éloignés pour deux pages différentes', async () => {
    const a = await calculerDhash(await imageDeTest(7));
    const b = await calculerDhash(await imageDeTest(8));
    expect(distanceHamming(a, b)).toBeGreaterThan(5);
  });
});

describe('distanceHamming', () => {
  it('compte les bits différents', () => {
    expect(distanceHamming('0000000000000000', '0000000000000000')).toBe(0);
    expect(distanceHamming('0000000000000000', '000000000000000f')).toBe(4);
    expect(distanceHamming('ffffffffffffffff', '0000000000000000')).toBe(64);
  });
});
