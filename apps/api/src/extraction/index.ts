import { creerClientAnthropic, extrairePage, MODELE_PAR_DEFAUT } from '@diabook/extraction';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { stockage } from '../lib/stockage.js';
import { creerFileMemoire } from './file.js';
import { traiterPhoto } from './traitement.js';

const modele = config.CLAUDE_MODEL || MODELE_PAR_DEFAUT;
let client: ReturnType<typeof creerClientAnthropic> | null = null;

/** La lecture automatique demande une clé API Anthropic. */
export function lectureActive(): boolean {
  return Boolean(config.ANTHROPIC_API_KEY) && stockage !== null;
}

export const fileExtraction = creerFileMemoire(
  (tache) =>
    traiterPhoto(tache.photoId, {
      prisma,
      modele,
      lirePhoto: (fichier) => {
        if (!stockage) throw new Error('Stockage des photos non configuré');
        return stockage.lire(fichier);
      },
      extraire: (image, meta) => {
        client ??= creerClientAnthropic({ apiKey: config.ANTHROPIC_API_KEY });
        return extrairePage(image, meta, { client, modele });
      },
    }),
  { parallele: 2 },
);

let avertissementAffiche = false;

/** Met les photos dans la file, dans l'ordre donné (l'ordre des pages du lot). */
export function lancerExtraction(photoIds: string[]): void {
  if (!lectureActive()) {
    if (!avertissementAffiche) {
      console.warn(
        'Lecture des photos désactivée : ANTHROPIC_API_KEY est vide. Les photos restent « reçues » et seront lues au prochain démarrage avec une clé.',
      );
      avertissementAffiche = true;
    }
    return;
  }
  fileExtraction.ajouter(photoIds.map((photoId) => ({ photoId })));
}

/** Au démarrage : relance les photos reçues ou interrompues (la file en mémoire est perdue à l'arrêt). */
export async function reprendreExtractions(): Promise<void> {
  const photos = await prisma.photo.findMany({
    where: { statut: { in: ['RECUE', 'EN_COURS'] } },
    orderBy: [{ lot: { creeLe: 'asc' } }, { ordreDansLot: 'asc' }],
    select: { id: true },
  });
  if (photos.length > 0) {
    console.log(`Reprise de la lecture de ${photos.length} photo(s) en attente`);
    lancerExtraction(photos.map((photo) => photo.id));
  }
}
