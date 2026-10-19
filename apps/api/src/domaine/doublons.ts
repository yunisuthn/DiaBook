import { distanceHamming } from '../lib/images.js';

/** Au-delà, deux photos sont considérées comme différentes. */
export const SEUIL_DOUBLON = 5;

export interface PhotoHash {
  id: string;
  hash: string;
}

export interface DoublonProbable {
  /** Photo déjà reçue la plus proche */
  id: string;
  distance: number;
}

/**
 * Pour chaque nouvelle photo (dans l'ordre de l'envoi), la photo la plus proche parmi celles déjà reçues
 * et les précédentes du même envoi, si la distance de Hamming est ≤ SEUIL_DOUBLON ; sinon null.
 * Un doublon probable n'est pas rejeté : il est signalé à l'utilisateur.
 */
export function trouverDoublons(
  nouvelles: PhotoHash[],
  dejaRecues: PhotoHash[],
): (DoublonProbable | null)[] {
  const references = [...dejaRecues];
  return nouvelles.map((photo) => {
    let plusProche: DoublonProbable | null = null;
    for (const reference of references) {
      const distance = distanceHamming(photo.hash, reference.hash);
      if (distance <= SEUIL_DOUBLON && (!plusProche || distance < plusProche.distance)) {
        plusProche = { id: reference.id, distance };
      }
    }
    references.push(photo);
    return plusProche;
  });
}
