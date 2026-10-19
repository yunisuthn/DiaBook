import { describe, expect, it, vi } from 'vitest';
import { creerFileMemoire } from './file.js';

/** Tâche dont on décide à la main quand elle se termine. */
function tachesPilotees() {
  const fins = new Map<string, () => void>();
  const ordreDepart: string[] = [];
  const traiter = vi.fn(
    ({ photoId }: { photoId: string }) =>
      new Promise<void>((resoudre) => {
        ordreDepart.push(photoId);
        fins.set(photoId, resoudre);
      }),
  );
  const terminer = async (photoId: string) => {
    fins.get(photoId)?.();
    await new Promise((resoudre) => setTimeout(resoudre, 0));
  };
  return { traiter, ordreDepart, terminer };
}

describe('file d’extraction en mémoire', () => {
  it('traite dans l’ordre d’ajout, deux à la fois au plus', async () => {
    const { traiter, ordreDepart, terminer } = tachesPilotees();
    const file = creerFileMemoire(traiter, { parallele: 2 });

    file.ajouter(['p1', 'p2', 'p3', 'p4'].map((photoId) => ({ photoId })));
    expect(ordreDepart).toEqual(['p1', 'p2']);
    expect(file.enAttente()).toBe(2);

    await terminer('p2');
    expect(ordreDepart).toEqual(['p1', 'p2', 'p3']);

    await terminer('p1');
    await terminer('p3');
    await terminer('p4');
    expect(ordreDepart).toEqual(['p1', 'p2', 'p3', 'p4']);
    await expect(file.vide()).resolves.toBeUndefined();
  });

  it('continue après une tâche en échec', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const traites: string[] = [];
    const file = creerFileMemoire(
      async ({ photoId }) => {
        if (photoId === 'p1') throw new Error('panne');
        traites.push(photoId);
      },
      { parallele: 1 },
    );
    file.ajouter([{ photoId: 'p1' }, { photoId: 'p2' }]);
    await file.vide();
    expect(traites).toEqual(['p2']);
  });

  it('vide() se résout tout de suite quand rien n’est en cours', async () => {
    const file = creerFileMemoire(async () => undefined);
    await expect(file.vide()).resolves.toBeUndefined();
  });
});
