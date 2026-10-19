// Lance l'extraction sur les 7 photos de test et compare le résultat aux extractions de référence
// (cahier-extract/out/*.json) : nombre de voyages, montants et statuts qui diffèrent.
//
//   pnpm --filter extraction test:photos [dossier-des-photos]
//
// Photos attendues par défaut dans cahier-extract/photos/, sous le nom indiqué par le champ « photo »
// de chaque fichier de out/ (ex. 1791355790670_image.png). Appelle l'API Claude : 7 requêtes facturées.
// Les photos sont envoyées telles quelles (sans le redimensionnement fait par l'API DiaBook à la réception).
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { comparerPages, formaterNombre } from '../comparaison.js';
import { ErreurExtraction, extrairePage, MODELE_PAR_DEFAUT } from '../extraire.js';
import { schemaPage } from '../schema.js';

const RACINE = path.resolve(import.meta.dirname, '../../../..');
const DOSSIER_REFERENCE = path.join(RACINE, 'cahier-extract/out');
const dossierPhotos = path.resolve(process.argv[2] ?? path.join(RACINE, 'cahier-extract/photos'));

// Clé et modèle lus dans le .env de la racine, comme pour l'API.
try {
  process.loadEnvFile(path.join(RACINE, '.env'));
} catch {
  // Pas de .env : variables d'environnement du shell.
}
const modele = process.env.CLAUDE_MODEL || MODELE_PAR_DEFAUT;

/** L'API Claude refuse les images de plus de 5 Mo. */
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

function typeMime(fichier: string): 'image/jpeg' | 'image/png' | null {
  const extension = path.extname(fichier).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  return null;
}

const existe = (fichier: string) =>
  access(fichier).then(
    () => true,
    () => false,
  );

async function main(): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY est vide : renseignez-la dans le fichier .env de la racine.');
    return 1;
  }

  const references = (await readdir(DOSSIER_REFERENCE))
    .filter((nom) => nom.endsWith('.json'))
    .sort();
  const cas = await Promise.all(
    references.map(async (nom) => {
      const contenu = JSON.parse(await readFile(path.join(DOSSIER_REFERENCE, nom), 'utf8')) as {
        photo?: string;
      };
      const photo = contenu.photo ?? nom.replace(/\.json$/, '.png');
      return {
        photo,
        chemin: path.join(dossierPhotos, photo),
        reference: schemaPage.parse(contenu),
      };
    }),
  );

  const absentes = [];
  for (const { chemin } of cas) if (!(await existe(chemin))) absentes.push(chemin);
  if (absentes.length > 0) {
    console.error(`Photos de test introuvables (${absentes.length}/${cas.length}) :`);
    for (const chemin of absentes) console.error(`  ${chemin}`);
    console.error('Copiez-les dans ce dossier ou passez le dossier en argument.');
    return 1;
  }

  console.log(`Extraction de ${cas.length} photos avec ${modele}\n`);
  const totaux = {
    attendus: 0,
    obtenus: 0,
    montants: 0,
    statuts: 0,
    erreurs: 0,
    entree: 0,
    sortie: 0,
  };

  for (const { photo, chemin, reference } of cas) {
    try {
      const type = typeMime(chemin);
      if (!type) throw new Error('format non pris en charge (JPEG ou PNG attendu)');
      const image = await readFile(chemin);
      if (image.length > TAILLE_MAX_IMAGE) {
        throw new Error(
          `${(image.length / 1024 / 1024).toFixed(1)} Mo : réduisez la photo sous 5 Mo (limite de l’API)`,
        );
      }
      const resultat = await extrairePage(image, {}, { modele, typeMime: type });
      const comparaison = comparerPages(reference, resultat.page);
      totaux.attendus += comparaison.voyagesAttendus;
      totaux.obtenus += comparaison.voyagesObtenus;
      totaux.montants += comparaison.montants.length;
      totaux.statuts += comparaison.statuts.length;
      totaux.entree += resultat.tokensEntree;
      totaux.sortie += resultat.tokensSortie;

      const ok =
        comparaison.voyagesAttendus === comparaison.voyagesObtenus &&
        comparaison.montants.length + comparaison.statuts.length === 0;
      console.log(
        `${ok ? '✓' : '✗'} ${photo} — ${comparaison.voyagesObtenus} voyage(s) trouvé(s), ` +
          `${comparaison.voyagesAttendus} attendu(s) · ${(resultat.dureeMs / 1000).toFixed(1)} s · ` +
          `${formaterNombre(resultat.tokensEntree)} + ${formaterNombre(resultat.tokensSortie)} tokens` +
          (resultat.essais > 1 ? ' · 2 essais' : ''),
      );
      for (const ecart of comparaison.montants)
        console.log(
          `    montant  ${ecart.voyage} : attendu ${ecart.attendu}, obtenu ${ecart.obtenu}`,
        );
      for (const ecart of comparaison.statuts)
        console.log(
          `    statut   ${ecart.voyage} : attendu ${ecart.attendu}, obtenu ${ecart.obtenu}`,
        );
      for (const voyage of comparaison.manquants) console.log(`    manquant ${voyage}`);
      for (const voyage of comparaison.enTrop) console.log(`    en trop  ${voyage}`);
    } catch (erreur) {
      totaux.erreurs += 1;
      const message =
        erreur instanceof ErreurExtraction ? `${erreur.code} : ${erreur.message}` : String(erreur);
      console.log(`✗ ${photo} — échec de l'extraction (${message})`);
    }
  }

  console.log(
    `\nTotal : ${totaux.obtenus} voyages trouvés / ${totaux.attendus} attendus · ` +
      `${totaux.montants} montant(s) et ${totaux.statuts} statut(s) différents · ` +
      `${totaux.erreurs} échec(s) · ${formaterNombre(totaux.entree)} + ${formaterNombre(totaux.sortie)} tokens`,
  );
  return totaux.erreurs > 0 ? 1 : 0;
}

process.exitCode = await main();
