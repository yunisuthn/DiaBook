import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { trouverDoublons } from '../domaine/doublons.js';
import { lancerExtraction, lectureActive } from '../extraction/index.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ErreurApi, erreurs } from '../lib/erreurs.js';
import { type ImagePretraitee, pretraiterImage } from '../lib/images.js';
import { prisma } from '../lib/prisma.js';
import { type FichierStocke, stockage } from '../lib/stockage.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const routeurLots = Router();
// Avant multer : on ne lit pas les photos d'une requête non authentifiée.
routeurLots.use(requireAuth);

export const PHOTOS_MAX = 20;
export const TAILLE_MAX_PHOTO = 15 * 1024 * 1024;
const TYPES_ACCEPTES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

const reception = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX_PHOTO, files: PHOTOS_MAX },
  fileFilter: (_req, fichier, accepter) => {
    if (TYPES_ACCEPTES.has(fichier.mimetype)) accepter(null, true);
    else
      accepter(
        new ErreurApi(
          415,
          'FORMAT_NON_ACCEPTE',
          `« ${fichier.originalname} » n’est pas une photo JPEG, PNG ou HEIC`,
        ),
      );
  },
});

const inclureLot = {
  camion: { select: { id: true, immatriculation: true, nom: true } },
  photos: {
    orderBy: { ordreDansLot: 'asc' },
    include: { doublonDe: { select: { id: true, lotId: true, url: true } } },
  },
} satisfies Prisma.LotInclude;

type LotComplet = Prisma.LotGetPayload<{ include: typeof inclureLot }>;

function formaterLot(lot: LotComplet) {
  return {
    id: lot.id,
    statut: lot.statut,
    creeLe: lot.creeLe,
    camion: lot.camion,
    photos: lot.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      ordre: photo.ordreDansLot,
      statut: photo.statut,
      largeur: photo.largeur,
      hauteur: photo.hauteur,
      dateUpload: photo.dateUpload,
      doublonProbable: photo.doublonDe
        ? {
            photoId: photo.doublonDe.id,
            lotId: photo.doublonDe.lotId,
            url: photo.doublonDe.url,
            distance: photo.distanceDoublon,
          }
        : null,
    })),
  };
}

/** Date du jour à Antananarivo, AAAA-MM-JJ. */
function dateDuJour(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Indian/Antananarivo' }).format(new Date());
}

/** « 1234 TBA » → « 1234-TBA » (nom de dossier sûr). */
function dossierCamion(immatriculation: string): string {
  return immatriculation.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'camion';
}

routeurLots.post('/', reception.array('photos', PHOTOS_MAX), async (req, res) => {
  if (!stockage) {
    throw new ErreurApi(
      503,
      'STOCKAGE_NON_CONFIGURE',
      'Le stockage des photos n’est pas configuré (CLOUDINARY_URL)',
    );
  }
  const depot = stockage;
  const { camionId } = z.object({ camionId: z.uuid('Choisissez un camion') }).parse(req.body);
  const fichiers = Array.isArray(req.files) ? req.files : [];
  if (fichiers.length === 0) {
    throw new ErreurApi(400, 'AUCUNE_PHOTO', 'Ajoutez au moins une photo');
  }
  const camion = await prisma.camion.findUnique({ where: { id: camionId } });
  if (!camion) throw erreurs.nonTrouve('Camion introuvable');
  if (!camion.actif) {
    throw new ErreurApi(400, 'CAMION_INACTIF', `Le camion ${camion.immatriculation} est désactivé`);
  }

  // 1. Prétraitement de toutes les photos avant tout envoi : une photo illisible annule l'envoi.
  const images: ImagePretraitee[] = [];
  for (const [index, fichier] of fichiers.entries()) {
    try {
      images.push(await pretraiterImage(fichier.buffer));
    } catch {
      const heic = /hei[cf]/.test(fichier.mimetype);
      throw new ErreurApi(
        422,
        'PHOTO_ILLISIBLE',
        `Photo ${index + 1} (« ${fichier.originalname} ») illisible` +
          (heic ? ' : le format HEIC n’est pas pris en charge, envoyez-la en JPEG' : ''),
      );
    }
  }

  // 2. Doublons probables, parmi les photos déjà reçues et celles de cet envoi.
  const ids = images.map(() => randomUUID());
  const dejaRecues = await prisma.photo.findMany({ select: { id: true, hashPerceptuel: true } });
  const doublons = trouverDoublons(
    images.map((image, index) => ({ id: ids[index] ?? '', hash: image.hash })),
    dejaRecues.map((photo) => ({ id: photo.id, hash: photo.hashPerceptuel })),
  );

  // 3. Envoi au stockage, puis enregistrement ; en cas d'échec, on retire les fichiers déjà envoyés.
  const lotId = randomUUID();
  const dossier = `diabook/${dossierCamion(camion.immatriculation)}/${dateDuJour()}`;
  const envoyes: FichierStocke[] = [];
  try {
    for (const [index, image] of images.entries()) {
      const nom = `${lotId}-${String(index + 1).padStart(2, '0')}`;
      try {
        envoyes.push(await depot.envoyer(image.jpeg, { dossier, nom }));
      } catch (erreur) {
        console.error(erreur);
        throw new ErreurApi(
          502,
          'STOCKAGE_INDISPONIBLE',
          'Envoi des photos vers le stockage impossible, réessayez',
        );
      }
    }

    const lot = await prisma.lot.create({
      data: {
        id: lotId,
        camionId: camion.id,
        creeParId: req.utilisateur?.sub ?? '',
        photos: {
          create: images.map((image, index) => ({
            id: ids[index],
            url: envoyes[index]?.url ?? '',
            stockageId: envoyes[index]?.id ?? '',
            largeur: image.largeur,
            hauteur: image.hauteur,
            hashPerceptuel: image.hash,
            doublonDeId: doublons[index]?.id ?? null,
            distanceDoublon: doublons[index]?.distance ?? null,
            camionId: camion.id,
            ordreDansLot: index + 1,
          })),
        },
      },
      include: inclureLot,
    });
    // Lecture par l'IA en arrière-plan, dans l'ordre des pages.
    lancerExtraction(lot.photos.map((photo) => photo.id));
    res.status(201).json({ lot: formaterLot(lot) });
  } catch (erreur) {
    await Promise.allSettled(envoyes.map((fichier) => depot.supprimer(fichier.id)));
    throw erreur;
  }
});

routeurLots.get('/:id', async (req, res) => {
  const { id } = z.object({ id: z.uuid() }).parse(req.params);
  const lot = await prisma.lot.findUnique({ where: { id }, include: inclureLot });
  if (!lot) throw erreurs.nonTrouve('Envoi introuvable');
  res.json({ lot: formaterLot(lot) });
});

/** Avancement de la lecture : « 3 / 7 pages lues ». */
routeurLots.get('/:id/progression', async (req, res) => {
  const { id } = z.object({ id: z.uuid() }).parse(req.params);
  const lot = await prisma.lot.findUnique({
    where: { id },
    select: { statut: true, photos: { select: { statut: true } } },
  });
  if (!lot) throw erreurs.nonTrouve('Envoi introuvable');
  const compter = (statut: string) => lot.photos.filter((photo) => photo.statut === statut).length;
  const enAttente = compter('RECUE');
  const enCours = compter('EN_COURS');
  res.json({
    progression: {
      statut: lot.statut,
      total: lot.photos.length,
      lues: compter('EXTRAITE'),
      erreurs: compter('ERREUR'),
      enCours,
      enAttente,
      termine: enAttente + enCours === 0,
      lectureActive: lectureActive(),
    },
  });
});
