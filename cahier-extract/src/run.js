// Fusionne + valide toutes les extractions de out/ et écrit rapport.md + journees.json
// Usage : node src/run.js [dossier=out]
import fs from "node:fs/promises";
import path from "node:path";
import { fusionner } from "./merge.js";
import { valider, resume, fmt } from "./validate.js";

const dossier = process.argv[2] || "out";
const fichiers = (await fs.readdir(dossier)).filter((f) => f.endsWith(".json")).sort();
const pages = await Promise.all(fichiers.map(async (f) => JSON.parse(await fs.readFile(path.join(dossier, f), "utf8"))));

const { journees, journal } = fusionner(pages);
const alertes = valider({ journees });
const lignes = resume(journees);

const icone = { erreur: "🔴", attention: "🟠", info: "🔵" };
let md = `# Rapport d'extraction\n\n${pages.length} photos → ${journees.length} journées, ${journees.reduce((s, j) => s + j.voyages.length, 0)} voyages.\n\n`;
md += `## Journées\n\n| Date | Voyages (payés/service/attente) | Recettes | Apports | Dépenses | Solde calculé | Solde écrit | |\n|---|---|---|---|---|---|---|---|\n`;
for (const l of lignes)
  md += `| ${l.date} | ${l.voyages} (${l.payes}/${l.services}/${l.attente}) | ${fmt(l.recettes)} | ${fmt(l.apports)} | ${fmt(l.depenses)} | ${fmt(l.solde_calcule)} | ${fmt(l.solde_ecrit)} | ${l.ok ? "✅" : "❌"} |\n`;
md += `\n## Alertes (${alertes.length})\n\n`;
for (const a of alertes) md += `- ${icone[a.niveau]} **${a.date ?? "global"}** — ${a.message}\n`;
md += `\n## Journal de fusion\n\n${journal.map((l) => `- ${l}`).join("\n")}\n`;
md += `\n## Détail des voyages\n\n| Date | N° | Produit | Trajet | Montant | Retenue | Statut | Conf. |\n|---|---|---|---|---|---|---|---|\n`;
for (const j of journees)
  for (const v of j.voyages)
    md += `| ${j.date} | ${v.numero ?? "–"} | ${v.produit}${v.pieces ? ` (${v.pieces} pcs)` : ""} | ${v.origine_normalise ?? v.origine ?? "?"} → ${v.destination_normalise ?? v.destination ?? "?"} | ${fmt(v.montant)} | ${v.retenue ? fmt(v.retenue) : ""} | ${v.statut} | ${v.confiance} |\n`;

await fs.writeFile("rapport.md", md);
await fs.writeFile("journees.json", JSON.stringify({ journees, alertes }, null, 2));
console.log(md);
