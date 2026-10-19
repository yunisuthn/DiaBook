import { describe, expect, it } from 'vitest';
import { calculerCaisse, calculerJournee, type JourneeACalculer } from './calcul.js';

// Les 7 journées du prototype (cahier-extract/journees.json) ; les valeurs attendues sont celles de
// cahier-extract/rapport.md. Seuls les champs utiles au calcul sont repris ; le numéro du voyage est en commentaire.
interface CasRapport {
  date: string;
  journee: JourneeACalculer;
  attendu: { recettes: number; apports: number; depenses: number; solde: number; ecart: number };
}

const paye = (montant: number, retenue = 0) => ({ statut: 'PAYE' as const, montant, retenue });
const service = () => ({ statut: 'SERVICE' as const, montant: 0, retenue: 0 });
const enAttente = (montant: number) => ({ statut: 'EN_ATTENTE' as const, montant, retenue: 0 });
const depense = (montant: number) => ({ montant });

const JOURNEES_RAPPORT: CasRapport[] = [
  {
    date: '2026-09-28',
    journee: {
      voyages: [service() /* n°1 */, paye(80_000) /* n°2 */, paye(160_000) /* n°3 */],
      depenses: [depense(12_000) /* sakafo */, depense(15_000) /* dokera */],
      mouvements: [],
      soldeEcrit: 213_000,
    },
    attendu: { recettes: 240_000, apports: 0, depenses: 27_000, solde: 213_000, ecart: 0 },
  },
  {
    date: '2026-09-29',
    journee: {
      voyages: [
        paye(70_000) /* n°4 */,
        paye(120_000, 50_000) /* n°5 : 120000 - 50000 */,
        service() /* n°6 */,
      ],
      depenses: [
        depense(10_000) /* sakafo */,
        depense(10_000) /* police */,
        depense(50_000) /* vidim-pasika */,
        depense(20_000) /* G.O */,
      ],
      mouvements: [],
      soldeEcrit: 50_000,
    },
    attendu: { recettes: 140_000, apports: 0, depenses: 90_000, solde: 50_000, ecart: 0 },
  },
  {
    date: '2026-09-30',
    journee: {
      voyages: [
        paye(80_000) /* n°7 */,
        paye(60_000) /* n°8 */,
        paye(200_000) /* n°9 */,
        service() /* n°10 */,
      ],
      depenses: [
        depense(60_000) /* G.O */,
        depense(10_000) /* sakafo */,
        depense(130_000) /* vidina gravillon */,
      ],
      mouvements: [
        { type: 'APPORT', montant: 140_000 } /* Vola tany an-trano */,
        { type: 'TOTAL_ECRIT', montant: 480_000 } /* Total vola */,
      ],
      soldeEcrit: 280_000,
    },
    attendu: { recettes: 340_000, apports: 140_000, depenses: 200_000, solde: 280_000, ecart: 0 },
  },
  {
    date: '2026-10-01',
    journee: {
      voyages: [
        paye(60_000) /* n°11 */,
        service() /* n°12 */,
        paye(70_000) /* n°13 */,
        paye(50_000) /* n°14 */,
        paye(40_000) /* n°15 */,
      ],
      depenses: [
        depense(10_000) /* sakafo */,
        depense(60_000) /* G.O */,
        depense(45_000) /* croix */,
        depense(50_000) /* vidim-pasika */,
      ],
      mouvements: [],
      soldeEcrit: 55_000,
    },
    attendu: { recettes: 220_000, apports: 0, depenses: 165_000, solde: 55_000, ecart: 0 },
  },
  {
    // Date déduite. Le rapport signale un écart de 10 000 Ar (montant du n°16 lu avec doute).
    date: '2026-10-02',
    journee: {
      voyages: [paye(75_000) /* n°16 */, service() /* n°18 */, service() /* n°19 */],
      depenses: [depense(12_000) /* sakafo */, depense(20_000) /* dokera */],
      mouvements: [{ type: 'AUTRE', montant: 580_000 } /* Vola Ambohipanja (encadré) */],
      soldeEcrit: 53_000,
    },
    attendu: { recettes: 75_000, apports: 0, depenses: 32_000, solde: 43_000, ecart: 10_000 },
  },
  {
    date: '2026-10-03',
    journee: {
      voyages: [
        paye(120_000) /* n°20 */,
        paye(60_000) /* n°21 */,
        service() /* n°23 */,
        service() /* sans numéro */,
      ],
      depenses: [
        depense(10_000) /* sakafo */,
        depense(10_000) /* dokera */,
        depense(50_000) /* vidim-pasika */,
        depense(3_000) /* ristourne */,
      ],
      mouvements: [],
      soldeEcrit: 107_000,
    },
    attendu: { recettes: 180_000, apports: 0, depenses: 73_000, solde: 107_000, ecart: 0 },
  },
  {
    date: '2026-10-05',
    journee: {
      voyages: [
        enAttente(70_000) /* moellon, créance */,
        paye(70_000) /* sable */,
        paye(200_000) /* gravillon */,
      ],
      depenses: [depense(10_000) /* sakafo */, depense(2_000) /* motard */],
      mouvements: [],
      soldeEcrit: 258_000,
    },
    attendu: { recettes: 270_000, apports: 0, depenses: 12_000, solde: 258_000, ecart: 0 },
  },
];

describe('calculerJournee — journées du rapport du prototype', () => {
  it.each(JOURNEES_RAPPORT)('$date', ({ journee, attendu }) => {
    expect(calculerJournee(journee)).toEqual(attendu);
  });

  it('retrouve les soldes écrits sauf le 2026-10-02', () => {
    const enEcart = JOURNEES_RAPPORT.filter((cas) => calculerJournee(cas.journee).ecart !== 0);
    expect(enEcart.map((cas) => cas.date)).toEqual(['2026-10-02']);
  });
});

describe('calculerJournee — règle', () => {
  const vide: JourneeACalculer = { voyages: [], depenses: [], mouvements: [], soldeEcrit: null };

  it('ne compte ni les voyages en attente, ni les services, ni les statuts inconnus', () => {
    const calcul = calculerJournee({
      ...vide,
      voyages: [
        enAttente(150_000),
        { statut: 'SERVICE', montant: 90_000, retenue: 0 },
        { statut: 'INCONNU', montant: 60_000, retenue: 0 },
        paye(100_000),
      ],
    });
    expect(calcul.recettes).toBe(100_000);
    expect(calcul.solde).toBe(100_000);
  });

  it('ne compte que les apports parmi les mouvements', () => {
    const calcul = calculerJournee({
      ...vide,
      mouvements: [
        { type: 'APPORT', montant: 50_000 },
        { type: 'REMISE', montant: 30_000 },
        { type: 'TOTAL_ECRIT', montant: 400_000 },
        { type: 'AUTRE', montant: 580_000 },
      ],
    });
    expect(calcul.apports).toBe(50_000);
    expect(calcul.solde).toBe(50_000);
  });

  it('donne un écart null quand aucun solde n’est écrit', () => {
    expect(calculerJournee({ ...vide, voyages: [paye(10_000)] }).ecart).toBeNull();
  });

  it('peut donner un solde négatif', () => {
    expect(calculerJournee({ ...vide, depenses: [depense(25_000)] }).solde).toBe(-25_000);
  });

  it('refuse les montants non entiers', () => {
    expect(() => calculerJournee({ ...vide, voyages: [paye(1000.5)] })).toThrow(TypeError);
    expect(() => calculerJournee({ ...vide, depenses: [depense(Number.NaN)] })).toThrow(TypeError);
  });
});

describe('calculerCaisse — créances encaissées', () => {
  const journees = JOURNEES_RAPPORT.map((cas) => cas.journee);
  // Soldes calculés du rapport : 213 000 + 50 000 + 280 000 + 55 000 + 43 000 + 107 000 + 258 000
  const SOLDE_JOURNEES = 1_006_000;

  it('additionne les soldes calculés des journées', () => {
    expect(calculerCaisse(journees, [])).toEqual({
      soldeJournees: SOLDE_JOURNEES,
      creancesEncaissees: 0,
      horsCaisse: 0,
      solde: SOLDE_JOURNEES,
    });
  });

  it('ajoute les paiements encaissés mais pas ceux hors caisse', () => {
    // La créance du 2026-10-05 (moellon, 70 000 Ar) payée en deux fois, dont 20 000 hors caisse.
    const calcul = calculerCaisse(journees, [
      { montant: 50_000, mode: 'CAISSE' },
      { montant: 20_000, mode: 'HORS_CAISSE' },
    ]);
    expect(calcul.creancesEncaissees).toBe(50_000);
    expect(calcul.horsCaisse).toBe(20_000);
    expect(calcul.solde).toBe(SOLDE_JOURNEES + 50_000);
  });

  it('ne change pas le solde d’une journée', () => {
    const journee = JOURNEES_RAPPORT.find((cas) => cas.date === '2026-10-05')?.journee;
    if (!journee) throw new Error('journée du 2026-10-05 absente des cas de test');
    const avant = calculerJournee(journee);
    calculerCaisse(journees, [{ montant: 70_000, mode: 'CAISSE' }]);
    expect(calculerJournee(journee)).toEqual(avant);
  });

  it('refuse les montants de paiement non entiers', () => {
    expect(() => calculerCaisse([], [{ montant: 10.5, mode: 'CAISSE' }])).toThrow(TypeError);
  });
});
