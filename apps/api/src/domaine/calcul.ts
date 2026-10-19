import type { ModePaiement, StatutVoyage, TypeMouvement } from '../generated/prisma/enums.js';

/** Ce dont le calcul a besoin d'une journée (compatible avec une Journee Prisma incluant ses lignes). */
export interface JourneeACalculer {
  voyages: { statut: StatutVoyage; montant: number; retenue: number }[];
  depenses: { montant: number }[];
  mouvements: { type: TypeMouvement; montant: number }[];
  soldeEcrit: number | null;
}

export interface CalculJournee {
  /** Σ(montant − retenue) des voyages payés */
  recettes: number;
  /** Σ des mouvements APPORT (« Vola tany an-trano ») */
  apports: number;
  depenses: number;
  /** recettes + apports − dépenses */
  solde: number;
  /** soldeEcrit − solde ; null si aucun solde n'est écrit. */
  ecart: number | null;
}

function verifierEntier(valeur: number, libelle: string): number {
  if (!Number.isSafeInteger(valeur)) {
    throw new TypeError(`${libelle} doit être un entier en Ariary (reçu : ${valeur})`);
  }
  return valeur;
}

/**
 * Règle de CLAUDE.md :
 *   solde = Σ(montant − retenue) des voyages payés + apports − Σ dépenses
 * Les voyages « service », « en attente » et de statut inconnu ne comptent pas dans la caisse ;
 * les mouvements REMISE, TOTAL_ECRIT et AUTRE non plus (TOTAL_ECRIT sert de contrôle).
 */
export function calculerJournee(journee: JourneeACalculer): CalculJournee {
  let recettes = 0;
  for (const voyage of journee.voyages) {
    const montant = verifierEntier(voyage.montant, 'montant du voyage');
    const retenue = verifierEntier(voyage.retenue, 'retenue du voyage');
    if (voyage.statut === 'PAYE') recettes += montant - retenue;
  }

  let apports = 0;
  for (const mouvement of journee.mouvements) {
    const montant = verifierEntier(mouvement.montant, 'montant du mouvement');
    if (mouvement.type === 'APPORT') apports += montant;
  }

  let depenses = 0;
  for (const depense of journee.depenses) {
    depenses += verifierEntier(depense.montant, 'montant de la dépense');
  }

  const solde = recettes + apports - depenses;
  const ecart = journee.soldeEcrit === null ? null : journee.soldeEcrit - solde;
  return { recettes, apports, depenses, solde, ecart };
}

export interface PaiementACalculer {
  montant: number;
  mode: ModePaiement;
}

export interface CalculCaisse {
  /** Σ des soldes calculés des journées */
  soldeJournees: number;
  /** Σ des paiements de créances encaissés (mode CAISSE) */
  creancesEncaissees: number;
  /** Σ des paiements hors caisse : affichés, mais hors solde */
  horsCaisse: number;
  /** soldeJournees + creancesEncaissees */
  solde: number;
}

/**
 * Caisse d'une période (règle « Créances » de CLAUDE.md) :
 *   caisse = Σ soldes calculés des journées validées + Σ paiements encaissés de la période
 * L'appelant fournit les journées validées et les paiements de la période (et du camion) voulus.
 */
export function calculerCaisse(
  journees: JourneeACalculer[],
  paiements: PaiementACalculer[],
): CalculCaisse {
  const soldeJournees = journees.reduce(
    (total, journee) => total + calculerJournee(journee).solde,
    0,
  );

  let creancesEncaissees = 0;
  let horsCaisse = 0;
  for (const paiement of paiements) {
    const montant = verifierEntier(paiement.montant, 'montant du paiement');
    if (paiement.mode === 'CAISSE') creancesEncaissees += montant;
    else horsCaisse += montant;
  }

  return {
    soldeJournees,
    creancesEncaissees,
    horsCaisse,
    solde: soldeJournees + creancesEncaissees,
  };
}
