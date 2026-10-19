// Fusion de plusieurs pages extraites en journées uniques.
// - journées datées : regroupées par date
// - blocs sans date (suite de la page précédente) : rattachés grâce à la numérotation continue
//   des voyages, sinon à la dernière journée laissée "ouverte" (fin coupée, sans solde)
// - doublons (même page photographiée deux fois) : dédoublonnés
import { normaliserLieu } from "./lieux.js";

const cleVoyage = (v) =>
  v.numero != null
    ? `n${v.numero}`
    : `${v.produit}|${normaliserLieu(v.origine).nom}|${normaliserLieu(v.destination).nom}|${v.montant}`;
const cleDepense = (d) => `${d.categorie}|${d.montant}`;
const cleMouvement = (m) => `${m.type}|${m.montant}`;

function fusionnerListes(cible, ajout, cle, journal, quoi) {
  for (const el of ajout) {
    const i = cible.findIndex((x) => cle(x) === cle(el));
    if (i === -1) cible.push(el);
    else {
      journal.push(`doublon ${quoi} ${cle(el)} (photos ${cible[i]._photo} / ${el._photo})`);
      if ((el.confiance ?? 1) > (cible[i].confiance ?? 1)) cible[i] = el;
    }
  }
}

function premiereDate(page) {
  return page.journees.map((j) => j.date).filter(Boolean).sort()[0] ?? "9999";
}

export function fusionner(pages) {
  const journal = [];
  const journees = []; // { date, date_inferee, voyages, depenses, mouvements, solde_ecrit, soldes_intermediaires, photos, ouverte }
  const enAttente = []; // blocs sans date à rattacher

  // Ordre de traitement : par première date visible, les pages sans date à la fin
  const tri = [...pages].sort((a, b) => premiereDate(a).localeCompare(premiereDate(b)));

  for (const page of tri) {
    for (const j of page.journees) {
      const marque = (arr) => arr.map((x) => ({ ...x, _photo: page.photo }));
      const bloc = {
        ...j,
        voyages: marque(j.voyages),
        depenses: marque(j.depenses),
        mouvements: marque(j.mouvements),
        _photo: page.photo,
      };
      if (!j.date) { enAttente.push(bloc); continue; }
      let cible = journees.find((x) => x.date === j.date);
      if (!cible) {
        cible = { date: j.date, date_inferee: false, voyages: [], depenses: [], mouvements: [],
          solde_ecrit: null, soldes_intermediaires: [], photos: [], ouverte: false };
        journees.push(cible);
      }
      ajouterBloc(cible, bloc, journal);
    }
  }

  // Rattacher les blocs sans date, dans l'ordre des numéros de voyage (blocs sans numéro en dernier)
  const minNum = (b) => Math.min(...b.voyages.map((v) => v.numero ?? Infinity));
  enAttente.sort((a, b) => minNum(a) - minNum(b));
  for (const bloc of enAttente) {
    let cible = null;
    const nums = bloc.voyages.map((v) => v.numero).filter((n) => n != null);
    if (nums.length) {
      const min = Math.min(...nums);
      // journée contenant le plus grand numéro < min
      let meilleur = -Infinity;
      for (const j of journees)
        for (const v of j.voyages)
          if (v.numero != null && v.numero < min && v.numero > meilleur) { meilleur = v.numero; cible = j; }
      if (cible && cible.solde_ecrit != null && bloc.solde_ecrit != null) {
        // La journée précédente est déjà clôturée et ce bloc a son propre solde : nouvelle journée, date non écrite
        const d = new Date(cible.date + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + 1);
        const date = d.toISOString().slice(0, 10);
        journal.push(`⚠ bloc sans date (${bloc._photo}) : la journée du ${cible.date} est déjà clôturée → nouvelle journée, date déduite ${date} (à confirmer)`);
        cible = { date, date_inferee: true, voyages: [], depenses: [], mouvements: [],
          solde_ecrit: null, soldes_intermediaires: [], photos: [], ouverte: false };
        journees.push(cible);
      } else if (cible) journal.push(`bloc sans date (${bloc._photo}) rattaché au ${cible.date} via voyage n°${meilleur} → n°${min}`);
    }
    if (!cible) {
      cible = journees.find((j) => j.ouverte && j.solde_ecrit == null);
      if (cible) journal.push(`bloc sans date (${bloc._photo}) rattaché au ${cible.date} (journée restée ouverte, sans solde)`);
    }
    if (!cible) { journal.push(`⚠ bloc sans date (${bloc._photo}) impossible à rattacher → à classer à la main`); continue; }
    ajouterBloc(cible, bloc, journal);
  }

  journees.sort((a, b) => a.date.localeCompare(b.date));
  return { journees, journal };
}

function ajouterBloc(cible, bloc, journal) {
  fusionnerListes(cible.voyages, bloc.voyages, cleVoyage, journal, "voyage");
  fusionnerListes(cible.depenses, bloc.depenses, cleDepense, journal, "dépense");
  fusionnerListes(cible.mouvements, bloc.mouvements, cleMouvement, journal, "mouvement");
  if (bloc.solde_ecrit != null) {
    if (cible.solde_ecrit != null && cible.solde_ecrit !== bloc.solde_ecrit)
      journal.push(`⚠ ${cible.date} : deux soldes différents lus (${cible.solde_ecrit} / ${bloc.solde_ecrit})`);
    cible.solde_ecrit = bloc.solde_ecrit;
  }
  cible.soldes_intermediaires.push(...(bloc.soldes_intermediaires ?? []));
  if (!cible.photos.includes(bloc._photo)) cible.photos.push(bloc._photo);
  cible.ouverte = !!bloc.fin_coupee && cible.solde_ecrit == null;
  cible.voyages.sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));
}
