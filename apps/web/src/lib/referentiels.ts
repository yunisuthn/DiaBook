import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appelApi } from './api';

export interface Camion {
  id: string;
  immatriculation: string;
  nom: string;
  actif: boolean;
}

export type RolePersonne = 'CHAUFFEUR' | 'RECEVEUR';

export interface Personne {
  id: string;
  nom: string;
  role: RolePersonne;
  telephone: string | null;
  actif: boolean;
}

export const LIBELLES_ROLE: Record<RolePersonne, string> = {
  CHAUFFEUR: 'Chauffeur',
  RECEVEUR: 'Receveur',
};

export type SaisieCamion = Omit<Camion, 'id'>;
export type SaisiePersonne = Omit<Personne, 'id'>;

const CLE_CAMIONS = ['camions'] as const;
const CLE_PERSONNES = ['personnes'] as const;

/** Crée (sans id) ou modifie (avec id) une ressource, puis rafraîchit sa liste. */
function useEnregistrer<T>(ressource: 'camions' | 'personnes') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, donnees }: { id?: string; donnees: T }) =>
      appelApi<unknown>(id ? `/${ressource}/${id}` : `/${ressource}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(donnees),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ressource] }),
  });
}

function useSupprimer(ressource: 'camions' | 'personnes') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appelApi<unknown>(`/${ressource}/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ressource] }),
  });
}

export function useCamions() {
  return useQuery({
    queryKey: CLE_CAMIONS,
    queryFn: async () => (await appelApi<{ camions: Camion[] }>('/camions')).camions,
  });
}

export const useEnregistrerCamion = () => useEnregistrer<SaisieCamion>('camions');
export const useSupprimerCamion = () => useSupprimer('camions');

export function usePersonnes() {
  return useQuery({
    queryKey: CLE_PERSONNES,
    queryFn: async () => (await appelApi<{ personnes: Personne[] }>('/personnes')).personnes,
  });
}

export const useEnregistrerPersonne = () => useEnregistrer<SaisiePersonne>('personnes');
export const useSupprimerPersonne = () => useSupprimer('personnes');
