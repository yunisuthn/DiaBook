// Contrôles automatiques après fusion : calculs, numérotation, dates, créances, lieux, confiance.
import { normaliserLieu } from "./lieux.js";

const fmt = (n) => (n == null ? "?" : n.toLocaleString("fr-FR").replace(/ | /g, " ") + " Ar");
const somme = (arr) => arr.reduce((s, x) => s + (x ?? 0), 0);
const SEUIL_CONFIANCE = 0.75;

export function calculerJournee(j) {
  const payes = j.voyages.filter((v) => v.statut === "paye");
  const recettes = somme(payes.map((v) => (v.montant ?? 0) - (v.retenue ?? 0)));
  const apports = somme(j.mouvements.filter((m) => m.type === "apport").map((m) => m.montant));
  const depenses = somme(j.depenses.map((d) => d.montant));
  return { recettes, apports, depenses, solde: recettes + apports - depenses };
}

export function valider({ journees }) {
  const alertes = []; // { niveau: 'erreur'|'attention'|'info', date, message }
  const add = (niveau, date, message) => alertes.push({ niveau, date, message });

  for (const j of journees) {
    const c = calculerJournee(j);
    j.calcul = c;
    if (j.date_inferee) add("attention", j.date, "Date non écrite dans le cahier, déduite de la position. À confirmer.");

    // 1. Solde
    if (j.solde_ecrit == null) add("attention", j.date, `Aucun solde écrit lu (calculé : ${fmt(c.solde)}). Page manquante ?`);
    else if (j.solde_ecrit !== c.solde) {
      const ecart = j.solde_ecrit - c.solde;
      const pistes = [];
      for (const v of j.voyages) {
        if (v.statut !== "paye" && v.montant && v.montant === ecart) pistes.push(`le voyage n°${v.numero ?? "?"} (${v.statut}) compterait-il ?`);
        if (v.statut === "paye" && (v.confiance ?? 1) <= SEUIL_CONFIANCE) pistes.push(`montant du voyage n°${v.numero ?? "?"} lu ${fmt(v.montant)} avec doute`);
      }
      for (const d of j.depenses) if ((d.confiance ?? 1) <= SEUIL_CONFIANCE) pistes.push(`dépense « ${d.libelle_brut} » lue ${fmt(d.montant)} avec doute`);
      if (j.voyages.some((v) => v.statut === "inconnu")) pistes.push("un voyage a un statut inconnu");
      add("erreur", j.date, `Solde écrit ${fmt(j.solde_ecrit)} ≠ calculé ${fmt(c.solde)} (écart ${fmt(ecart)}).` +
        (pistes.length ? ` Pistes : ${pistes.join(" ; ")}.` : ""));
    }

    // 2. Total écrit intermédiaire
    for (const m of j.mouvements.filter((m) => m.type === "total_ecrit")) {
      const attendu = c.recettes + c.apports;
      if (m.montant !== attendu)
        add("erreur", j.date, `« ${m.libelle_brut} » écrit ${fmt(m.montant)} ≠ recettes + apports calculés ${fmt(attendu)} (écart ${fmt(m.montant - attendu)}).`);
    }

    // 3. Créances
    for (const v of j.voyages.filter((v) => v.statut === "en_attente"))
      add("info", j.date, `Créance : voyage n°${v.numero ?? "?"} ${v.produit} ${v.origine} → ${v.destination}, ${fmt(v.montant)} non encore payé.`);

    // 4. Confiance & champs manquants
    for (const v of j.voyages) {
      if ((v.confiance ?? 1) < SEUIL_CONFIANCE || v.doutes?.length)
        add("attention", j.date, `Voyage n°${v.numero ?? "?"} à vérifier (confiance ${v.confiance})${v.doutes?.length ? " : " + v.doutes.join(" ; ") : ""}.`);
      if (v.statut === "paye" && v.montant == null) add("erreur", j.date, `Voyage n°${v.numero ?? "?"} payé sans montant.`);
      for (const champ of ["origine", "destination"]) {
        const l = normaliserLieu(v[champ]);
        if (v[champ] && !l.connu) add("attention", j.date, `Lieu inconnu « ${v[champ]} » (voyage n°${v.numero ?? "?"}) → à ajouter au dictionnaire ou corriger.`);
        else if (l.connu && l.nom !== v[champ]) v[champ + "_normalise"] = l.nom;
      }
    }
  }

  // 5. Numérotation continue
  const nums = journees.flatMap((j) => j.voyages.map((v) => ({ n: v.numero, date: j.date }))).filter((x) => x.n != null);
  const vus = new Map();
  for (const { n, date } of nums) {
    if (vus.has(n)) add("erreur", date, `Numéro de voyage ${n} en double (aussi le ${vus.get(n)}).`);
    vus.set(n, date);
  }
  const tries = [...vus.keys()].sort((a, b) => a - b);
  for (let i = 1; i < tries.length; i++)
    for (let k = tries[i - 1] + 1; k < tries[i]; k++)
      add("attention", vus.get(tries[i]), `Voyage n°${k} absent : page manquante, oubli de numéro, ou voyage non numéroté ?`);
  const sansNum = journees.flatMap((j) => j.voyages.filter((v) => v.numero == null).map(() => j.date));
  if (sansNum.length) add("info", null, `${sansNum.length} voyage(s) sans numéro (${[...new Set(sansNum)].join(", ")}).`);

  return alertes;
}

export function resume(journees) {
  const lignes = journees.map((j) => ({
    date: j.date + (j.date_inferee ? " (déduite)" : ""),
    voyages: j.voyages.length,
    payes: j.voyages.filter((v) => v.statut === "paye").length,
    services: j.voyages.filter((v) => v.statut === "service").length,
    attente: j.voyages.filter((v) => v.statut === "en_attente").length,
    recettes: j.calcul.recettes, apports: j.calcul.apports, depenses: j.calcul.depenses,
    solde_calcule: j.calcul.solde, solde_ecrit: j.solde_ecrit,
    ok: j.solde_ecrit === j.calcul.solde,
  }));
  return lignes;
}

export { fmt };
