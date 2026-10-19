/** Une photo à lire. Reste sérialisable pour pouvoir passer à BullMQ (job = { photoId }). */
export interface TacheExtraction {
  photoId: string;
}

/**
 * File des extractions. L'implémentation en mémoire suffit pour commencer ; une implémentation
 * BullMQ (Redis) respectera la même interface : ajouter() publie les jobs, un worker appelle traiter().
 */
export interface FileExtraction {
  /** Ajoute des tâches, traitées dans l'ordre d'ajout. */
  ajouter(taches: TacheExtraction[]): void;
}

export interface FileMemoire extends FileExtraction {
  /** Tâches pas encore démarrées */
  enAttente(): number;
  /** Se résout quand toutes les tâches ajoutées sont terminées (tests, arrêt propre). */
  vide(): Promise<void>;
}

/**
 * File en mémoire : FIFO, `parallele` tâches au plus en même temps.
 * Perdue à l'arrêt du serveur : les photos non lues sont reprises au démarrage.
 */
export function creerFileMemoire(
  traiter: (tache: TacheExtraction) => Promise<void>,
  { parallele = 2 }: { parallele?: number } = {},
): FileMemoire {
  const attente: TacheExtraction[] = [];
  let actives = 0;
  let attentesVide: (() => void)[] = [];

  function demarrerSuivantes(): void {
    while (actives < parallele && attente.length > 0) {
      const tache = attente.shift() as TacheExtraction;
      actives += 1;
      traiter(tache)
        .catch((erreur: unknown) => {
          // traiter() enregistre ses propres échecs ; ceci ne devrait pas arriver.
          console.error(`Extraction de la photo ${tache.photoId} interrompue :`, erreur);
        })
        .finally(() => {
          actives -= 1;
          demarrerSuivantes();
        });
    }
    if (actives === 0 && attente.length === 0) {
      attentesVide.forEach((resoudre) => resoudre());
      attentesVide = [];
    }
  }

  return {
    ajouter(taches) {
      attente.push(...taches);
      demarrerSuivantes();
    },
    enAttente: () => attente.length,
    vide: () =>
      actives === 0 && attente.length === 0
        ? Promise.resolve()
        : new Promise((resoudre) => attentesVide.push(resoudre)),
  };
}
