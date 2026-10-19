import type { StatutVoyage } from '@diabook/extraction';

export type { StatutVoyage };

/** Dates au format ISO : « 2026-10-05 » ; horodatages : « 2026-10-05T19:20 ». Montants : Ariary entiers. */
export interface Voyage {
  /** Numéro entouré dans le cahier, continu d'un jour à l'autre pour un même camion. */
  numero: number;
  produit: string;
  quantite: string;
  origine: string;
  destination: string;
  montant: number;
  retenue: number;
  statut: StatutVoyage;
  /** L'IA signale une lecture douteuse (rature, chiffre peu lisible). */
  incertain?: boolean;
}

export interface Depense {
  categorie: string;
  montant: number;
}

export type StatutJournee = 'a_valider' | 'validee';

export interface Journee {
  id: string;
  date: string;
  camion: string;
  chauffeur: string;
  statut: StatutJournee;
  photo: string;
  voyages: Voyage[];
  depenses: Depense[];
  /** « Vola tany an-trano » */
  apports: number[];
  /** « Total vola », quand il est écrit. */
  totalEcrit?: number;
  /** « Reste » / « Reste vola » écrit en bas de page. */
  resteEcrit: number;
  valideeLe?: string;
}

/** caisse : le montant entre dans le solde du jour du paiement ; hors_caisse : créance soldée sans entrer en caisse. */
export type ModePaiement = 'caisse' | 'hors_caisse';

export interface Creance {
  id: string;
  numeroVoyage: number;
  camion: string;
  dateVoyage: string;
  produit: string;
  quantite: string;
  origine: string;
  destination: string;
  montant: number;
  paiement: { date: string; mode: ModePaiement } | null;
}

export type EtatImport = 'lecture' | 'a_valider' | 'validee' | 'echec';

export interface ImportPage {
  id: string;
  importeeLe: string;
  camion: string;
  etat: EtatImport;
  journeeId?: string;
  message?: string;
}

export interface Camion {
  immatriculation: string;
  chauffeurHabituel: string;
  actif: boolean;
}

export interface Chauffeur {
  nom: string;
  camionHabituel: string;
}

export interface Produit {
  nomCahier: string;
  produit: string;
  achatLie?: string;
}

export interface Lieu {
  nom: string;
  variantes: string[];
}

export interface Referentiels {
  camions: Camion[];
  chauffeurs: Chauffeur[];
  produits: Produit[];
  lieux: Lieu[];
  categoriesDepense: string[];
}
