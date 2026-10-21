// Compare les versions du prompt sur TOUTES les lignes de test, et les note automatiquement.
//
// Usage :
//   npm run evaluer                          → toutes les versions (v0, v1, v1_1, v2)
//   npm run evaluer -- --versions v1_1,v2    → seulement certaines versions
//   npm run evaluer -- --detail              → affiche aussi chaque réponse du modèle
//   npm run evaluer -- --rpm 15              → nombre maximum de requêtes par minute (offre gratuite : 15)
//
// Deux notes par version :
//   - « justes »  : la réponse contient tout ce qui est attendu et aucun mot interdit (donnees/attendus.js) ;
//   - « format »  : chaque ligne de réponse commence par une étiquette (VOYAGE n°7 :, DÉPENSE :, …).
//     v0 répond en phrase libre : elle échoue au format par construction.

import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { lireLigne } from '../lib/lecteur.js';
import { PROMPTS } from '../prompts/cahier.js';
import { CAS } from '../donnees/attendus.js';

const { values: options } = parseArgs({
  options: {
    versions: { type: 'string', default: Object.keys(PROMPTS).join(',') },
    detail: { type: 'boolean', default: false },
    rpm: { type: 'string', default: '15' },
  },
});

// Offre gratuite : 15 requêtes par minute pour ce modèle. Au-delà, Google répond 429.
// On espace donc les appels : 60 000 ms / 15 = 4 000 ms entre deux requêtes.
const PAUSE_MS = Math.ceil(60_000 / Number(options.rpm));

const versions = options.versions.split(',').map((v) => v.trim());
const inconnues = versions.filter((v) => !PROMPTS[v]);
if (inconnues.length) {
  console.error(
    `❌ Version(s) inconnue(s) : ${inconnues.join(', ')}. Disponibles : ${Object.keys(PROMPTS).join(', ')}`,
  );
  process.exit(1);
}

console.log(
  `Évaluation · ${MODELE} · température 0 · ${versions.length} version(s) × ${CAS.length} lignes ` +
    `= ${versions.length * CAS.length} appels ` +
    `(${options.rpm} par minute max : ≈ ${Math.ceil((versions.length * CAS.length * PAUSE_MS) / 60_000)} min)\n`,
);

const bilans = [];
try {
  const ai = creerClient();

  for (const version of versions) {
    const bilan = { version, justes: 0, format: 0, entree: 0, sortie: 0, echecs: [] };

    for (const [i, cas] of CAS.entries()) {
      const debut = Date.now();
      const { texte, entree, sortie } = await lireLigne(ai, version, cas.ligne);
      await attendre(PAUSE_MS - (Date.now() - debut)); // respecter le rythme maximum
      bilan.entree += entree;
      bilan.sortie += sortie;

      const { manquants, interditsTrouves } = noter(texte, cas);
      const juste = manquants.length === 0 && interditsTrouves.length === 0;
      if (juste) bilan.justes += 1;
      if (formatEtiquete(texte)) bilan.format += 1;
      if (!juste) bilan.echecs.push({ numero: i + 1, manquants, interditsTrouves });

      if (options.detail) {
        console.log(`[${version} · ligne ${i + 1}] ${juste ? '✅' : '❌'} ${cas.ligne}`);
        console.log(texte.replace(/^/gm, '    '));
      }
    }

    bilans.push(bilan);
    console.log(
      `${version} : ${bilan.justes}/${CAS.length} justes · ${bilan.format}/${CAS.length} au format`,
    );
  }
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}

// --- Tableau final ---------------------------------------------------------------
if (bilans.length) {
  console.log('\n--- Comparaison ---');
  console.table(
    Object.fromEntries(
      bilans.map((b) => [
        b.version,
        {
          justes: `${b.justes}/${CAS.length}`,
          format: `${b.format}/${CAS.length}`,
          'entrée (tokens)': b.entree,
          'sortie (tokens)': b.sortie,
        },
      ]),
    ),
  );

  for (const b of bilans) {
    for (const e of b.echecs) {
      const raisons = [
        e.manquants.length ? `manque ${e.manquants.join(', ')}` : '',
        e.interditsTrouves.length ? `contient ${e.interditsTrouves.join(', ')}` : '',
      ].filter(Boolean);
      console.log(`❌ ${b.version} · ligne ${e.numero} : ${raisons.join(' ; ')}`);
    }
  }
}

// Note une réponse : ce qui manque parmi les attendus, et les mots interdits trouvés.
function noter(texte, { doitContenir, interdits }) {
  const t = normaliser(texte);
  const present = (mot) => t.includes(normaliser(mot));

  const manquants = doitContenir
    .filter((attendu) => (Array.isArray(attendu) ? !attendu.some(present) : !present(attendu)))
    .map((attendu) => (Array.isArray(attendu) ? attendu.join(' ou ') : attendu));
  const interditsTrouves = interdits.filter(present);
  return { manquants, interditsTrouves };
}

// Minuscules, et pas d'espace (ni point) entre les groupes de chiffres : « 120 000 » → « 120000 ».
function normaliser(texte) {
  return texte.toLowerCase().replace(/(\d)[\s  .](?=\d{3}\b)/g, '$1');
}

// Chaque ligne non vide de la réponse commence-t-elle par une étiquette du format ?
function formatEtiquete(texte) {
  const lignes = texte.split('\n').filter((l) => l.trim());
  const etiquette = /^(VOYAGE n°\d+ : |DÉPENSE : |MOUVEMENT : |SOLDE ÉCRIT : |INCONNU : )/;
  return lignes.length > 0 && lignes.every((l) => etiquette.test(l.trim()));
}

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}
