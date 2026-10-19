import { describe, expect, it } from 'vitest';
import { trouverDoublons } from './doublons.js';

describe('trouverDoublons', () => {
  const dejaRecues = [
    { id: 'ancienne-1', hash: '0000000000000000' },
    { id: 'ancienne-2', hash: 'ffffffffffffffff' },
  ];

  it('signale la photo déjà reçue la plus proche quand la distance est ≤ 5', () => {
    const resultat = trouverDoublons([{ id: 'n1', hash: '000000000000001f' }], dejaRecues);
    expect(resultat).toEqual([{ id: 'ancienne-1', distance: 5 }]);
  });

  it('ne signale rien au-delà de 5', () => {
    const resultat = trouverDoublons([{ id: 'n1', hash: '000000000000003f' }], dejaRecues);
    expect(resultat).toEqual([null]);
  });

  it('repère un doublon à l’intérieur du même envoi', () => {
    const resultat = trouverDoublons(
      [
        { id: 'n1', hash: '0f0f0f0f0f0f0f0f' },
        { id: 'n2', hash: '0f0f0f0f0f0f0f0e' },
      ],
      [],
    );
    expect(resultat).toEqual([null, { id: 'n1', distance: 1 }]);
  });

  it('préfère la plus proche', () => {
    const resultat = trouverDoublons(
      [{ id: 'n1', hash: '0000000000000001' }],
      [
        { id: 'a', hash: '0000000000000007' },
        { id: 'b', hash: '0000000000000000' },
      ],
    );
    expect(resultat).toEqual([{ id: 'b', distance: 1 }]);
  });
});
