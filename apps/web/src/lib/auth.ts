import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appelApi, ErreurApi } from './api';

export interface Utilisateur {
  id: string;
  email: string;
}

const CLE_MOI = ['auth', 'moi'] as const;

/** Utilisateur connecté, ou null si la session est absente ou expirée. */
export function useUtilisateur() {
  return useQuery({
    queryKey: CLE_MOI,
    queryFn: async () => {
      try {
        const { utilisateur } = await appelApi<{ utilisateur: Utilisateur }>('/auth/moi');
        return utilisateur;
      } catch (erreur) {
        if (erreur instanceof ErreurApi && erreur.statut === 401) return null;
        throw erreur;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnexion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identifiants: { email: string; motDePasse: string }) =>
      appelApi<{ utilisateur: Utilisateur }>('/auth/connexion', {
        method: 'POST',
        body: JSON.stringify(identifiants),
      }),
    onSuccess: ({ utilisateur }) => queryClient.setQueryData(CLE_MOI, utilisateur),
  });
}

export function useDeconnexion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => appelApi<unknown>('/auth/deconnexion', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(CLE_MOI, null);
    },
  });
}
