import type { PageExtraite, VoyageExtrait } from './schema.js';

export interface EcartVoyage {
  voyage: string;
  attendu: string;
  obtenu: string;
}

export interface ComparaisonPage {
  voyagesAttendus: number;
  voyagesObtenus: number;
  montants: EcartVoyage[];
  statuts: EcartVoyage[];
  /** Voyages attendus sans correspondant dans le résultat */
  manquants: string[];
  /** Voyages obtenus sans correspondant attendu */
  enTrop: string[];
}

const voyagesDe = (page: PageExtraite): VoyageExtrait[] =>
  page.journees.flatMap((journee) => journee.voyages);

export function decrireVoyage(voyage: VoyageExtrait): string {
  const numero = voyage.numero === null ? 'sans n°' : `n°${voyage.numero}`;
  return `${numero} ${voyage.produit} ${voyage.origine ?? '?'} → ${voyage.destination ?? '?'}`;
}

const cleTrajet = (voyage: VoyageExtrait): string =>
  [voyage.produit, voyage.origine, voyage.destination]
    .map((x) => (x ?? '').toLowerCase())
    .join('|');

/** 120000 → « 120 000 » (espace simple : affichage en terminal). */
export const formaterNombre = (nombre: number): string =>
  nombre.toLocaleString('fr-FR').replace(/\s/g, ' ');

const formaterMontant = (voyage: VoyageExtrait): string => {
  const montant = voyage.montant === null ? 'illisible' : formaterNombre(voyage.montant);
  return voyage.retenue ? `${montant} − ${formaterNombre(voyage.retenue)}` : montant;
};

/**
 * Apparie les voyages attendus et obtenus : d'abord par numéro entouré, puis (voyages sans numéro
 * ou numéro mal lu) par produit + trajet, enfin dans l'ordre de la page.
 */
export function apparierVoyages(
  attendus: VoyageExtrait[],
  obtenus: VoyageExtrait[],
): {
  paires: [VoyageExtrait, VoyageExtrait][];
  manquants: VoyageExtrait[];
  enTrop: VoyageExtrait[];
} {
  const restants = [...obtenus];
  const paires: [VoyageExtrait, VoyageExtrait][] = [];
  const sansCorrespondant: VoyageExtrait[] = [];
  const prendre = (critere: (obtenu: VoyageExtrait) => boolean) => {
    const index = restants.findIndex(critere);
    return index === -1 ? undefined : restants.splice(index, 1)[0];
  };

  for (const attendu of attendus) {
    const trouve =
      attendu.numero === null ? undefined : prendre((obtenu) => obtenu.numero === attendu.numero);
    if (trouve) paires.push([attendu, trouve]);
    else sansCorrespondant.push(attendu);
  }
  const manquants: VoyageExtrait[] = [];
  for (const attendu of sansCorrespondant) {
    const trouve =
      prendre((obtenu) => cleTrajet(obtenu) === cleTrajet(attendu)) ??
      prendre((obtenu) => obtenu.numero === null || attendu.numero === null);
    if (trouve) paires.push([attendu, trouve]);
    else manquants.push(attendu);
  }
  return { paires, manquants, enTrop: restants };
}

/** Compare l'extraction obtenue à l'extraction de référence d'une même photo. */
export function comparerPages(attendue: PageExtraite, obtenue: PageExtraite): ComparaisonPage {
  const attendus = voyagesDe(attendue);
  const obtenus = voyagesDe(obtenue);
  const { paires, manquants, enTrop } = apparierVoyages(attendus, obtenus);

  const montants: EcartVoyage[] = [];
  const statuts: EcartVoyage[] = [];
  for (const [attendu, obtenu] of paires) {
    if (attendu.montant !== obtenu.montant || (attendu.retenue ?? 0) !== (obtenu.retenue ?? 0)) {
      montants.push({
        voyage: decrireVoyage(attendu),
        attendu: formaterMontant(attendu),
        obtenu: formaterMontant(obtenu),
      });
    }
    if (attendu.statut !== obtenu.statut) {
      statuts.push({
        voyage: decrireVoyage(attendu),
        attendu: attendu.statut,
        obtenu: obtenu.statut,
      });
    }
  }

  return {
    voyagesAttendus: attendus.length,
    voyagesObtenus: obtenus.length,
    montants,
    statuts,
    manquants: manquants.map(decrireVoyage),
    enTrop: enTrop.map(decrireVoyage),
  };
}
