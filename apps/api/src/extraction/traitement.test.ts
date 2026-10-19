import { ErreurExtraction, type ResultatExtraction } from '@diabook/extraction';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { type DependancesTraitement, derniereDateLue, traiterPhoto } from './traitement.js';

const PHOTO = {
  id: 'photo-2',
  url: 'https://stockage.test/p2.jpg',
  stockageId: 'diabook/1234-TBA/2026-10-07/lot-02',
  camionId: 'camion-1',
  lotId: 'lot-1',
  ordreDansLot: 2,
  dateUpload: new Date('2026-10-07T08:00:00Z'),
  statut: 'RECUE',
  camion: { immatriculation: '1234 TBA' },
};

const PAGE_BRUTE = { qualite_photo: {}, journees: [{ date: '2026-10-02' }], remarques: [] };

function creerPrisma() {
  return {
    photo: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    lot: { updateMany: vi.fn(), update: vi.fn() },
    extraction: { create: vi.fn(), findMany: vi.fn() },
    journee: { findFirst: vi.fn() },
  };
}

let prisma: ReturnType<typeof creerPrisma>;
let dependances: DependancesTraitement;
const extraire = vi.fn<DependancesTraitement['extraire']>();
const lirePhoto = vi.fn<DependancesTraitement['lirePhoto']>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  prisma = creerPrisma();
  prisma.photo.findUnique.mockResolvedValue(PHOTO);
  prisma.extraction.findMany.mockResolvedValue([
    { jsonBrut: { journees: [{ date: '2026-10-01' }, { date: null }] } },
  ]);
  prisma.journee.findFirst.mockResolvedValue({ date: new Date('2026-09-30T00:00:00Z') });
  // Après ce traitement, plus aucune photo n'attend dans le lot.
  prisma.photo.findMany.mockResolvedValue([{ statut: 'EXTRAITE' }, { statut: 'EXTRAITE' }]);
  lirePhoto.mockResolvedValue(Buffer.from('jpeg'));
  dependances = {
    prisma: prisma as unknown as PrismaClient,
    lirePhoto,
    extraire,
    modele: 'claude-opus-5-5',
  };
});

const RESULTAT: ResultatExtraction = {
  page: PAGE_BRUTE as never,
  brut: PAGE_BRUTE,
  modele: 'claude-opus-5-5',
  dureeMs: 12_000,
  tokensEntree: 3200,
  tokensSortie: 1800,
  essais: 1,
};

describe('traiterPhoto', () => {
  it('lit la photo avec le camion et la dernière date connue, puis enregistre l’extraction', async () => {
    extraire.mockResolvedValue(RESULTAT);

    await traiterPhoto('photo-2', dependances);

    expect(lirePhoto).toHaveBeenCalledWith({ id: PHOTO.stockageId, url: PHOTO.url });
    expect(extraire).toHaveBeenCalledWith(expect.any(Buffer), {
      camion: '1234 TBA',
      datePrecedente: '2026-10-01',
    });
    expect(prisma.extraction.create).toHaveBeenCalledWith({
      data: {
        photoId: 'photo-2',
        modele: 'claude-opus-5-5',
        jsonBrut: PAGE_BRUTE,
        dureeMs: 12_000,
        tokensEntree: 3200,
        tokensSortie: 1800,
      },
    });
    expect(prisma.photo.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'photo-2' },
      data: { statut: 'EN_COURS' },
    });
    expect(prisma.photo.update).toHaveBeenLastCalledWith({
      where: { id: 'photo-2' },
      data: { statut: 'EXTRAITE' },
    });
    expect(prisma.lot.updateMany).toHaveBeenCalledWith({
      where: { id: 'lot-1', statut: 'RECU' },
      data: { statut: 'EN_COURS' },
    });
    expect(prisma.lot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { statut: 'TERMINE' },
    });
  });

  it('n’envoie pas de date quand aucune n’est connue', async () => {
    prisma.extraction.findMany.mockResolvedValue([]);
    prisma.journee.findFirst.mockResolvedValue(null);
    extraire.mockResolvedValue(RESULTAT);
    await traiterPhoto('photo-2', dependances);
    expect(extraire).toHaveBeenCalledWith(expect.any(Buffer), { camion: '1234 TBA' });
  });

  it('enregistre un échec avec le JSON brut, les tokens et l’erreur, et passe la photo en ERREUR', async () => {
    extraire.mockRejectedValue(
      new ErreurExtraction('Sortie invalide après 2 essais : …', 'SORTIE_INVALIDE', {
        brut: { journees: 'pas un tableau' },
        modele: 'claude-opus-5-5',
        dureeMs: 30_000,
        tokensEntree: 6400,
        tokensSortie: 3000,
        essais: 2,
      }),
    );
    prisma.photo.findMany.mockResolvedValue([{ statut: 'ERREUR' }]);

    await traiterPhoto('photo-2', dependances);

    expect(prisma.extraction.create).toHaveBeenCalledWith({
      data: {
        photoId: 'photo-2',
        modele: 'claude-opus-5-5',
        jsonBrut: { journees: 'pas un tableau' },
        dureeMs: 30_000,
        tokensEntree: 6400,
        tokensSortie: 3000,
        erreur: 'SORTIE_INVALIDE : Sortie invalide après 2 essais : …',
      },
    });
    expect(prisma.photo.update).toHaveBeenLastCalledWith({
      where: { id: 'photo-2' },
      data: { statut: 'ERREUR' },
    });
    // Aucune photo du lot n'a pu être lue.
    expect(prisma.lot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { statut: 'ERREUR' },
    });
  });

  it('enregistre aussi un échec survenu avant l’appel à l’IA (photo introuvable sur le stockage)', async () => {
    lirePhoto.mockRejectedValue(new Error('Photo illisible sur Cloudinary (404)'));
    await traiterPhoto('photo-2', dependances);
    expect(extraire).not.toHaveBeenCalled();
    expect(prisma.extraction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        modele: 'claude-opus-5-5',
        jsonBrut: Prisma.DbNull,
        tokensEntree: null,
        erreur: 'Photo illisible sur Cloudinary (404)',
      }),
    });
  });

  it('ne laisse pas le lot terminé tant que des photos attendent', async () => {
    extraire.mockResolvedValue(RESULTAT);
    prisma.photo.findMany.mockResolvedValue([{ statut: 'EXTRAITE' }, { statut: 'RECUE' }]);
    await traiterPhoto('photo-2', dependances);
    expect(prisma.lot.update).not.toHaveBeenCalled();
  });

  it('ignore une photo déjà lue (tâche en double, reprise au démarrage)', async () => {
    prisma.photo.findUnique.mockResolvedValue({ ...PHOTO, statut: 'EXTRAITE' });
    await traiterPhoto('photo-2', dependances);
    expect(extraire).not.toHaveBeenCalled();
    expect(prisma.photo.update).not.toHaveBeenCalled();
  });
});

describe('derniereDateLue', () => {
  it('prend la date la plus récente et ignore les valeurs invalides', () => {
    expect(
      derniereDateLue([
        { journees: [{ date: '2026-09-29' }, { date: null }] },
        { journees: [{ date: '2026-10-03' }, { date: '03-10-26' }] },
        null,
        { journees: 'invalide' },
      ]),
    ).toBe('2026-10-03');
    expect(derniereDateLue([])).toBeNull();
  });
});
