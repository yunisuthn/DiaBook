/** Erreur métier renvoyée au client sous la forme { erreur: { code, message } }. */
export class ErreurApi extends Error {
  constructor(
    public readonly statut: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

export const erreurs = {
  nonAuthentifie: (message = 'Authentification requise') =>
    new ErreurApi(401, 'NON_AUTHENTIFIE', message),
  identifiantsInvalides: () =>
    new ErreurApi(401, 'IDENTIFIANTS_INVALIDES', 'Email ou mot de passe incorrect'),
  nonTrouve: (message = 'Ressource introuvable') => new ErreurApi(404, 'NON_TROUVE', message),
  dejaExistant: (message: string) => new ErreurApi(409, 'DEJA_EXISTANT', message),
  enCoursUtilisation: (message: string) => new ErreurApi(409, 'EN_COURS_UTILISATION', message),
};
