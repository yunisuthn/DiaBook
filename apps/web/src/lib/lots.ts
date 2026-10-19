import { useQuery } from '@tanstack/react-query';
import { appelApi, ErreurApi } from './api';

export type StatutPhoto = 'RECUE' | 'EN_COURS' | 'EXTRAITE' | 'ERREUR';

export const LIBELLES_STATUT_PHOTO: Record<StatutPhoto, string> = {
  RECUE: 'Reçue',
  EN_COURS: 'Lecture en cours',
  EXTRAITE: 'Lue',
  ERREUR: 'Erreur',
};

export interface PhotoLot {
  id: string;
  url: string;
  /** Ordre de la page dans le cahier (1, 2, 3…) */
  ordre: number;
  statut: StatutPhoto;
  largeur: number;
  hauteur: number;
  dateUpload: string;
  doublonProbable: { photoId: string; lotId: string; url: string; distance: number | null } | null;
}

export interface Lot {
  id: string;
  statut: 'RECU' | 'EN_COURS' | 'TERMINE' | 'ERREUR';
  creeLe: string;
  camion: { id: string; immatriculation: string; nom: string };
  photos: PhotoLot[];
}

export const cleLot = (id: string) => ['lots', id] as const;

export function useLot(id: string) {
  return useQuery({
    queryKey: cleLot(id),
    queryFn: async () => (await appelApi<{ lot: Lot }>(`/lots/${id}`)).lot,
  });
}

/**
 * Envoie les photos dans l'ordre des pages. XMLHttpRequest plutôt que fetch :
 * c'est le seul moyen de suivre la progression de l'envoi.
 */
export function envoyerLot(
  camionId: string,
  fichiers: File[],
  onProgression: (fraction: number) => void,
): Promise<Lot> {
  const formulaire = new FormData();
  formulaire.append('camionId', camionId);
  for (const fichier of fichiers) formulaire.append('photos', fichier, fichier.name);

  return new Promise((resoudre, rejeter) => {
    const requete = new XMLHttpRequest();
    requete.open('POST', '/api/lots');
    requete.withCredentials = true;
    requete.responseType = 'json';
    requete.upload.onprogress = (evenement) => {
      if (evenement.lengthComputable) onProgression(evenement.loaded / evenement.total);
    };
    requete.onload = () => {
      const corps = requete.response as {
        lot?: Lot;
        erreur?: { code?: string; message?: string };
      } | null;
      if (requete.status === 201 && corps?.lot) {
        resoudre(corps.lot);
        return;
      }
      rejeter(
        new ErreurApi(
          requete.status,
          corps?.erreur?.code ?? 'ERREUR_INCONNUE',
          corps?.erreur?.message ?? `Erreur ${requete.status}`,
        ),
      );
    };
    requete.onerror = () =>
      rejeter(
        new ErreurApi(
          0,
          'RESEAU',
          'Connexion au serveur impossible. Vérifiez le réseau et réessayez.',
        ),
      );
    requete.send(formulaire);
  });
}

export interface ProgressionLot {
  statut: Lot['statut'];
  total: number;
  lues: number;
  erreurs: number;
  enCours: number;
  enAttente: number;
  termine: boolean;
  /** false si la clé API Anthropic n'est pas configurée sur le serveur */
  lectureActive: boolean;
}

/** Avancement de la lecture, interrogé toutes les 3 s jusqu'à la fin. */
export function useProgressionLot(id: string) {
  return useQuery({
    queryKey: [...cleLot(id), 'progression'],
    queryFn: async () =>
      (await appelApi<{ progression: ProgressionLot }>(`/lots/${id}/progression`)).progression,
    refetchInterval: (requete) => {
      const progression = requete.state.data;
      return progression && (progression.termine || !progression.lectureActive) ? false : 3000;
    },
  });
}
