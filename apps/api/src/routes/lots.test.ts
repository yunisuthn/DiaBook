import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { creerApp } from '../app.js';
import { lancerExtraction, lectureActive } from '../extraction/index.js';
import { calculerDhash, pretraiterImage } from '../lib/images.js';
import { prisma } from '../lib/prisma.js';
import { NOM_COOKIE_SESSION, signerSession } from '../lib/session.js';
import { stockage } from '../lib/stockage.js';
import { imageDeTest } from '../test-utils/images.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    camion: { findUnique: vi.fn() },
    photo: { findMany: vi.fn() },
    lot: { create: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('../extraction/index.js', () => ({
  lancerExtraction: vi.fn(),
  lectureActive: vi.fn(() => true),
  reprendreExtractions: vi.fn(),
}));

vi.mock('../lib/stockage.js', () => ({
  dossierLocal: null,
  stockage: { envoyer: vi.fn(), supprimer: vi.fn() },
}));

const mockPrisma = vi.mocked(prisma, { deep: true });
if (!stockage) throw new Error('le stockage simulé doit être défini');
const mockStockage = vi.mocked(stockage, { deep: true });
const app = creerApp();
const cookie = `${NOM_COOKIE_SESSION}=${signerSession({ sub: 'u1', email: 'admin@diabook.local' })}`;
const CAMION = {
  id: '6f1c2a3e-1b2c-4d5e-8f90-123456789abc',
  immatriculation: '1234 TBA',
  nom: 'Camion 1',
  actif: true,
};

interface PhotoCreee {
  id: string;
  ordreDansLot: number;
  doublonDeId: string | null;
  distanceDoublon: number | null;
}

/** Données passées à prisma.lot.create lors du dernier envoi. */
function photosCreees(): PhotoCreee[] {
  const appel = mockPrisma.lot.create.mock.calls.at(-1)?.[0] as unknown as {
    data: { photos: { create: PhotoCreee[] } };
  };
  return appel.data.photos.create;
}

let pageA: Buffer;
let pageB: Buffer;

beforeAll(async () => {
  pageA = await imageDeTest(11);
  pageB = await imageDeTest(22);
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.camion.findUnique.mockResolvedValue(CAMION as never);
  mockPrisma.photo.findMany.mockResolvedValue([]);
  let numero = 0;
  mockStockage.envoyer.mockImplementation(async (_image, { dossier, nom }) => {
    numero += 1;
    return {
      url: `https://stockage.test/${dossier}/${nom}.jpg`,
      id: `${dossier}/${nom}-${numero}`,
    };
  });
  // Renvoie le lot tel qu'il serait relu en base.
  mockPrisma.lot.create.mockImplementation((async ({
    data,
  }: {
    data: { id: string; photos: { create: (PhotoCreee & { url: string })[] } };
  }) => ({
    id: data.id,
    statut: 'RECU',
    creeLe: new Date(),
    camion: { id: CAMION.id, immatriculation: CAMION.immatriculation, nom: CAMION.nom },
    photos: data.photos.create.map((photo) => ({
      ...photo,
      statut: 'RECUE',
      dateUpload: new Date(),
      doublonDe: photo.doublonDeId ? { id: photo.doublonDeId, lotId: 'autre-lot', url: 'u' } : null,
    })),
  })) as never);
});

function envoyer() {
  return request(app).post('/api/lots').set('Cookie', cookie);
}

describe('POST /api/lots', () => {
  it('exige une session', async () => {
    const res = await request(app).post('/api/lots').attach('photos', pageA, 'a.jpg');
    expect(res.status).toBe(401);
  });

  it('exige un camion', async () => {
    const res = await envoyer().attach('photos', pageA, 'a.jpg');
    expect(res.status).toBe(400);
    expect(res.body.erreur.code).toBe('DONNEES_INVALIDES');
  });

  it('exige au moins une photo', async () => {
    const res = await envoyer().field('camionId', CAMION.id);
    expect(res.status).toBe(400);
    expect(res.body.erreur.code).toBe('AUCUNE_PHOTO');
  });

  it('refuse un fichier qui n’est pas une photo', async () => {
    const res = await envoyer()
      .field('camionId', CAMION.id)
      .attach('photos', Buffer.from('bonjour'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(415);
    expect(res.body.erreur.code).toBe('FORMAT_NON_ACCEPTE');
  });

  it('refuse une photo de plus de 15 Mo', async () => {
    const res = await envoyer()
      .field('camionId', CAMION.id)
      .attach('photos', Buffer.alloc(15 * 1024 * 1024 + 1), {
        filename: 'grosse.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(413);
    expect(res.body.erreur.code).toBe('PHOTO_TROP_LOURDE');
  });

  it('refuse plus de 20 photos', async () => {
    let requete = envoyer().field('camionId', CAMION.id);
    for (let i = 0; i < 21; i++) requete = requete.attach('photos', pageA, `p${i}.jpg`);
    const res = await requete;
    expect(res.status).toBe(400);
    expect(res.body.erreur.code).toBe('TROP_DE_PHOTOS');
  });

  it('renvoie 404 pour un camion inconnu', async () => {
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    const res = await envoyer().field('camionId', CAMION.id).attach('photos', pageA, 'a.jpg');
    expect(res.status).toBe(404);
  });

  it('signale une photo illisible sans rien envoyer', async () => {
    const res = await envoyer()
      .field('camionId', CAMION.id)
      .attach('photos', pageA, 'a.jpg')
      .attach('photos', Buffer.from('corrompu'), { filename: 'b.heic', contentType: 'image/heic' });
    expect(lancerExtraction).not.toHaveBeenCalled();
    expect(res.status).toBe(422);
    expect(res.body.erreur.message).toContain('Photo 2');
    expect(res.body.erreur.message).toContain('HEIC');
    expect(mockStockage.envoyer).not.toHaveBeenCalled();
  });

  it('crée le lot, envoie les photos dans diabook/<camion>/<date> et garde l’ordre', async () => {
    const res = await envoyer()
      .field('camionId', CAMION.id)
      .attach('photos', pageA, 'page1.jpg')
      .attach('photos', pageB, 'page2.jpg');

    expect(res.status).toBe(201);
    expect(mockStockage.envoyer).toHaveBeenCalledTimes(2);
    const [, emplacement] = mockStockage.envoyer.mock.calls[0] ?? [];
    expect(emplacement?.dossier).toMatch(/^diabook\/1234-TBA\/\d{4}-\d{2}-\d{2}$/);
    expect(emplacement?.nom).toBe(`${res.body.lot.id}-01`);

    expect(res.body.lot.photos.map((photo: { ordre: number }) => photo.ordre)).toEqual([1, 2]);
    expect(res.body.lot.photos[0].url).toContain('-01.jpg');
    expect(res.body.lot.photos[0].largeur).toBe(1200);
    expect(
      res.body.lot.photos.every((p: { doublonProbable: unknown }) => p.doublonProbable === null),
    ).toBe(true);
    // Lecture par l'IA lancée dans l'ordre des pages.
    expect(lancerExtraction).toHaveBeenCalledWith(
      res.body.lot.photos.map((photo: { id: string }) => photo.id),
    );
  });

  it('marque comme doublon probable une page déjà reçue, sans la rejeter', async () => {
    const hashDejaRecu = (await pretraiterImage(pageA)).hash;
    mockPrisma.photo.findMany.mockResolvedValue([
      { id: 'photo-ancienne', hashPerceptuel: hashDejaRecu },
    ] as never);

    const res = await envoyer()
      .field('camionId', CAMION.id)
      .attach('photos', await imageDeTest(11, { qualite: 50 }), 'page1-bis.jpg')
      .attach('photos', pageB, 'page2.jpg');

    expect(res.status).toBe(201);
    const [premiere, seconde] = photosCreees();
    expect(premiere?.doublonDeId).toBe('photo-ancienne');
    expect(premiere?.distanceDoublon).toBeLessThanOrEqual(5);
    expect(seconde?.doublonDeId).toBeNull();
    expect(res.body.lot.photos[0].doublonProbable).toMatchObject({ photoId: 'photo-ancienne' });
  });

  it('repère la même page envoyée deux fois dans un envoi', async () => {
    const res = await envoyer()
      .field('camionId', CAMION.id)
      .attach('photos', pageA, 'page1.jpg')
      .attach('photos', pageA, 'page1-encore.jpg');

    expect(res.status).toBe(201);
    const [premiere, seconde] = photosCreees();
    expect(seconde?.doublonDeId).toBe(premiere?.id);
    expect(seconde?.distanceDoublon).toBe(0);
  });

  it('retire les photos déjà envoyées si le stockage échoue en cours de route', async () => {
    mockStockage.envoyer
      .mockResolvedValueOnce({ url: 'https://stockage.test/1.jpg', id: 'id-1' })
      .mockRejectedValueOnce(new Error('réseau coupé'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await envoyer()
      .field('camionId', CAMION.id)
      .attach('photos', pageA, 'page1.jpg')
      .attach('photos', pageB, 'page2.jpg');

    expect(res.status).toBe(502);
    expect(res.body.erreur.code).toBe('STOCKAGE_INDISPONIBLE');
    expect(mockStockage.supprimer).toHaveBeenCalledWith('id-1');
    expect(mockPrisma.lot.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/lots/:id', () => {
  it('renvoie 404 pour un lot inconnu', async () => {
    mockPrisma.lot.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/lots/6f1c2a3e-1b2c-4d5e-8f90-000000000000')
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('renvoie les photos dans l’ordre avec leur statut', async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: 'lot-1',
      statut: 'RECU',
      creeLe: new Date(),
      camion: { id: CAMION.id, immatriculation: CAMION.immatriculation, nom: CAMION.nom },
      photos: [
        {
          id: 'p1',
          url: 'u1',
          ordreDansLot: 1,
          statut: 'RECUE',
          largeur: 1200,
          hauteur: 1600,
          dateUpload: new Date(),
          distanceDoublon: 2,
          doublonDe: { id: 'p0', lotId: 'lot-0', url: 'u0' },
        },
      ],
    } as never);

    const res = await request(app)
      .get('/api/lots/6f1c2a3e-1b2c-4d5e-8f90-000000000000')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.lot.photos[0]).toMatchObject({
      id: 'p1',
      ordre: 1,
      statut: 'RECUE',
      doublonProbable: { photoId: 'p0', lotId: 'lot-0', distance: 2 },
    });
  });
});

it('le dHash des images de test distingue bien les deux pages', async () => {
  // Garde-fou : si ce test échoue, les tests de doublons ci-dessus ne prouvent rien.
  const [a, b] = await Promise.all([calculerDhash(pageA), calculerDhash(pageB)]);
  expect(a).not.toBe(b);
});

describe('GET /api/lots/:id/progression', () => {
  const URL_PROGRESSION = '/api/lots/6f1c2a3e-1b2c-4d5e-8f90-000000000000/progression';

  it('compte les pages lues, en cours, en attente et en erreur', async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      statut: 'EN_COURS',
      photos: [
        { statut: 'EXTRAITE' },
        { statut: 'EXTRAITE' },
        { statut: 'EXTRAITE' },
        { statut: 'ERREUR' },
        { statut: 'EN_COURS' },
        { statut: 'EN_COURS' },
        { statut: 'RECUE' },
      ],
    } as never);
    const res = await request(app).get(URL_PROGRESSION).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.progression).toEqual({
      statut: 'EN_COURS',
      total: 7,
      lues: 3,
      erreurs: 1,
      enCours: 2,
      enAttente: 1,
      termine: false,
      lectureActive: true,
    });
  });

  it('indique la fin et l’absence de clé API', async () => {
    vi.mocked(lectureActive).mockReturnValueOnce(false);
    mockPrisma.lot.findUnique.mockResolvedValue({
      statut: 'TERMINE',
      photos: [{ statut: 'EXTRAITE' }, { statut: 'ERREUR' }],
    } as never);
    const res = await request(app).get(URL_PROGRESSION).set('Cookie', cookie);
    expect(res.body.progression).toMatchObject({
      termine: true,
      lues: 1,
      erreurs: 1,
      lectureActive: false,
    });
  });

  it('renvoie 404 pour un lot inconnu', async () => {
    mockPrisma.lot.findUnique.mockResolvedValue(null);
    const res = await request(app).get(URL_PROGRESSION).set('Cookie', cookie);
    expect(res.status).toBe(404);
  });
});
