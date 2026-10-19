import { describe, expect, it } from 'vitest';
import { comparerPages } from './comparaison.js';
import type { PageExtraite, VoyageExtrait } from './schema.js';

function voyage(champs: Partial<VoyageExtrait>): VoyageExtrait {
  return {
    numero: null,
    produit: 'sable',
    produit_brut: 'Fasika',
    quantite: 1,
    unite: 'voyage',
    origine: 'Lalam-baovao',
    destination: 'Ilafy',
    montant: 60000,
    retenue: null,
    statut: 'paye',
    texte_brut: '',
    confiance: 0.9,
    ...champs,
  };
}

function page(voyages: VoyageExtrait[]): PageExtraite {
  return {
    qualite_photo: { lisibilite: 'bonne', problemes: [] },
    journees: [
      {
        date: '2026-10-01',
        date_ecrite: null,
        debut_coupe: false,
        fin_coupee: false,
        voyages,
        depenses: [],
        mouvements: [],
        solde_ecrit: null,
      },
    ],
    remarques: [],
  };
}

describe('comparerPages', () => {
  it('ne signale rien pour deux lectures identiques', () => {
    const voyages = [voyage({ numero: 11 }), voyage({ numero: 12, statut: 'service', montant: 0 })];
    expect(comparerPages(page(voyages), page(voyages))).toEqual({
      voyagesAttendus: 2,
      voyagesObtenus: 2,
      montants: [],
      statuts: [],
      manquants: [],
      enTrop: [],
    });
  });

  it('apparie par numéro même si l’ordre change, et relève montants et statuts', () => {
    const attendue = page([
      voyage({ numero: 13, montant: 70000 }),
      voyage({ numero: 14, statut: 'paye' }),
    ]);
    const obtenue = page([
      voyage({ numero: 14, statut: 'service' }),
      voyage({ numero: 13, montant: 76000 }),
    ]);
    const comparaison = comparerPages(attendue, obtenue);
    expect(comparaison.montants).toEqual([
      { voyage: 'n°13 sable Lalam-baovao → Ilafy', attendu: '70 000', obtenu: '76 000' },
    ]);
    expect(comparaison.statuts).toEqual([
      { voyage: 'n°14 sable Lalam-baovao → Ilafy', attendu: 'paye', obtenu: 'service' },
    ]);
  });

  it('compte une retenue lue différemment comme un écart de montant ; null et 0 sont équivalents', () => {
    const attendue = page([
      voyage({ numero: 5, montant: 120000, retenue: 50000 }),
      voyage({ numero: 6 }),
    ]);
    const obtenue = page([
      voyage({ numero: 5, montant: 120000, retenue: null }),
      voyage({ numero: 6, retenue: 0 }),
    ]);
    expect(comparerPages(attendue, obtenue).montants).toEqual([
      { voyage: 'n°5 sable Lalam-baovao → Ilafy', attendu: '120 000 − 50 000', obtenu: '120 000' },
    ]);
  });

  it('apparie les voyages sans numéro par produit et trajet', () => {
    const attendue = page([
      voyage({
        produit: 'moellon',
        origine: 'Ambatomitsangana',
        destination: 'Antanambao',
        statut: 'en_attente',
      }),
      voyage({
        produit: 'gravillon',
        origine: 'Ambodifahitra',
        destination: 'Soavimasoandro',
        montant: 200000,
      }),
    ]);
    const obtenue = page([
      voyage({
        produit: 'gravillon',
        origine: 'Ambodifahitra',
        destination: 'Soavimasoandro',
        montant: 200000,
      }),
      voyage({
        produit: 'moellon',
        origine: 'Ambatomitsangana',
        destination: 'Antanambao',
        statut: 'paye',
      }),
    ]);
    const comparaison = comparerPages(attendue, obtenue);
    expect(comparaison.montants).toEqual([]);
    expect(comparaison.statuts).toEqual([
      {
        voyage: 'sans n° moellon Ambatomitsangana → Antanambao',
        attendu: 'en_attente',
        obtenu: 'paye',
      },
    ]);
  });

  it('liste les voyages manquants et en trop', () => {
    const attendue = page([voyage({ numero: 1 }), voyage({ numero: 2, destination: 'Lazaina' })]);
    const obtenue = page([
      voyage({ numero: 1 }),
      voyage({ numero: 3, produit: 'bois', destination: 'Anosy' }),
    ]);
    const comparaison = comparerPages(attendue, obtenue);
    expect(comparaison.manquants).toEqual(['n°2 sable Lalam-baovao → Lazaina']);
    expect(comparaison.enTrop).toEqual(['n°3 bois Lalam-baovao → Anosy']);
  });
});
