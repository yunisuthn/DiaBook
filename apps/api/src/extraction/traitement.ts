import { ErreurExtraction, type MetaPage, type ResultatExtraction } from '@diabook/extraction';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import type { FichierStocke } from '../lib/stockage.js';

export interface DependancesTraitement {
  prisma: PrismaClient;
  lirePhoto: (fichier: FichierStocke) => Promise<Buffer>;
  extraire: (image: Buffer, meta: MetaPage) => Promise<ResultatExtraction>;
  /** Modèle configuré (enregistré tel quel si l'échec survient avant tout appel à l'API) */
  modele: string;
}

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Plus récente date de journée lue dans des extractions (JSON brut), ou null. */
export function derniereDateLue(extractions: unknown[]): string | null {
  let derniere: string | null = null;
  for (const extraction of extractions) {
    const journees = (extraction as { journees?: unknown } | null)?.journees;
    if (!Array.isArray(journees)) continue;
    for (const journee of journees) {
      const date = (journee as { date?: unknown } | null)?.date;
      if (typeof date === 'string' && DATE_ISO.test(date) && (!derniere || date > derniere)) {
        derniere = date;
      }
    }
  }
  return derniere;
}

/**
 * Dernière date connue avant cette page, pour aider à dater une page sans date : pages précédentes
 * déjà lues pour ce camion (même envoi ou envois antérieurs) et journées enregistrées.
 */
async function dateConnueAvant(
  prisma: PrismaClient,
  photo: { id: string; camionId: string; lotId: string; ordreDansLot: number; dateUpload: Date },
): Promise<string | undefined> {
  const precedentes = await prisma.extraction.findMany({
    where: {
      erreur: null,
      photo: {
        camionId: photo.camionId,
        OR: [
          { lotId: photo.lotId, ordreDansLot: { lt: photo.ordreDansLot } },
          { lotId: { not: photo.lotId }, dateUpload: { lt: photo.dateUpload } },
        ],
      },
    },
    select: { jsonBrut: true },
    orderBy: { creeLe: 'desc' },
    take: 20,
  });
  const journee = await prisma.journee.findFirst({
    where: { camionId: photo.camionId },
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  const dates = [
    derniereDateLue(precedentes.map((extraction) => extraction.jsonBrut)),
    journee ? journee.date.toISOString().slice(0, 10) : null,
  ].filter((date): date is string => date !== null);
  return dates.sort().at(-1);
}

/** Lot terminé quand plus aucune photo n'attend ; en erreur si aucune n'a pu être lue. */
async function mettreAJourLot(prisma: PrismaClient, lotId: string): Promise<void> {
  const photos = await prisma.photo.findMany({ where: { lotId }, select: { statut: true } });
  if (photos.some((photo) => photo.statut === 'RECUE' || photo.statut === 'EN_COURS')) return;
  const toutesEnErreur = photos.length > 0 && photos.every((photo) => photo.statut === 'ERREUR');
  await prisma.lot.update({
    where: { id: lotId },
    data: { statut: toutesEnErreur ? 'ERREUR' : 'TERMINE' },
  });
}

/**
 * Lit une photo avec l'IA et enregistre le résultat (succès ou échec) dans Extraction.
 * Ne lève pas d'erreur : un échec est enregistré et la photo passe en ERREUR.
 */
export async function traiterPhoto(
  photoId: string,
  dependances: DependancesTraitement,
): Promise<void> {
  const { prisma } = dependances;
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { camion: { select: { immatriculation: true } } },
  });
  // Déjà lue (tâche en double, reprise au démarrage) : rien à faire.
  if (!photo || (photo.statut !== 'RECUE' && photo.statut !== 'EN_COURS')) return;

  await prisma.photo.update({ where: { id: photo.id }, data: { statut: 'EN_COURS' } });
  await prisma.lot.updateMany({
    where: { id: photo.lotId, statut: 'RECU' },
    data: { statut: 'EN_COURS' },
  });

  const debut = performance.now();
  try {
    const image = await dependances.lirePhoto({ id: photo.stockageId, url: photo.url });
    const datePrecedente = await dateConnueAvant(prisma, photo);
    const resultat = await dependances.extraire(image, {
      camion: photo.camion.immatriculation,
      ...(datePrecedente ? { datePrecedente } : {}),
    });
    await prisma.extraction.create({
      data: {
        photoId: photo.id,
        modele: resultat.modele,
        jsonBrut: resultat.brut as Prisma.InputJsonValue,
        dureeMs: resultat.dureeMs,
        tokensEntree: resultat.tokensEntree,
        tokensSortie: resultat.tokensSortie,
      },
    });
    await prisma.photo.update({ where: { id: photo.id }, data: { statut: 'EXTRAITE' } });
  } catch (erreur) {
    const details = erreur instanceof ErreurExtraction ? erreur.details : null;
    const message =
      erreur instanceof ErreurExtraction
        ? `${erreur.code} : ${erreur.message}`
        : erreur instanceof Error
          ? erreur.message
          : String(erreur);
    console.error(`Extraction de la photo ${photo.id} en échec : ${message}`);
    await prisma.extraction.create({
      data: {
        photoId: photo.id,
        modele: details?.modele ?? dependances.modele,
        // On garde la sortie brute même invalide : elle aide à comprendre l'échec.
        jsonBrut:
          details?.brut === null || details?.brut === undefined
            ? Prisma.DbNull
            : (details.brut as Prisma.InputJsonValue),
        dureeMs: details?.dureeMs ?? Math.round(performance.now() - debut),
        tokensEntree: details ? details.tokensEntree : null,
        tokensSortie: details ? details.tokensSortie : null,
        erreur: message,
      },
    });
    await prisma.photo.update({ where: { id: photo.id }, data: { statut: 'ERREUR' } });
  }
  await mettreAJourLot(prisma, photo.lotId);
}
