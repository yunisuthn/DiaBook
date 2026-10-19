/** Erreur renvoyée par l'API au format { erreur: { code, message } }. */
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

export async function appelApi<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const reponse = await fetch(`/api${chemin}`, { ...options, headers, credentials: 'include' });
  if (reponse.status === 204) return undefined as T;

  const corps: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const erreur = (corps as { erreur?: { code?: string; message?: string } } | null)?.erreur;
    throw new ErreurApi(
      reponse.status,
      erreur?.code ?? 'ERREUR_INCONNUE',
      erreur?.message ?? `Erreur ${reponse.status}`,
    );
  }
  return corps as T;
}
