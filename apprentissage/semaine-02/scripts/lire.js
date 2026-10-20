// Fait lire les lignes du cahier par le modèle, avec une version du prompt « lecteur de cahier ».
//
// Usage :
//   npm run lire                          → toutes les lignes, dernière version du prompt
//   npm run lire -- --version v0          → toutes les lignes, avec la version v0
//   npm run lire -- 7                     → seulement la 7e ligne
//   npm run lire -- "ma ligne" --version v1
//
// Si la version a des exemples (few-shot), ils sont envoyés avant la ligne, sous forme
// de faux échanges précédents : « utilisateur : ligne » → « modèle : réponse attendue ».

import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { LIGNES } from '../donnees/lignes.js';
import { PROMPTS, EXEMPLES, DERNIERE_VERSION } from '../prompts/cahier.js';

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: { version: { type: 'string', default: DERNIERE_VERSION } },
});

const prompt = PROMPTS[options.version];
if (!prompt) {
  console.error(
    `❌ Version inconnue « ${options.version} ». Disponibles : ${Object.keys(PROMPTS).join(', ')}`,
  );
  process.exit(1);
}

// Quelles lignes lire ? Toutes, un numéro de ligne, ou un texte libre.
const argument = positionals.join(' ').trim();
const numero = Number(argument);
const lignes = !argument
  ? LIGNES
  : Number.isInteger(numero) && numero >= 1 && numero <= LIGNES.length
    ? [LIGNES[numero - 1]]
    : [argument];

const exemples = EXEMPLES[options.version] ?? [];

// Les exemples deviennent un historique de conversation : chaque message a un rôle,
// « user » (ce qu'on envoie) ou « model » (ce que le modèle est censé avoir répondu).
const historiqueExemples = exemples.flatMap(({ ligne, reponse }) => [
  { role: 'user', parts: [{ text: ligne }] },
  { role: 'model', parts: [{ text: reponse }] },
]);

console.log(
  `Modèle : ${MODELE} · prompt ${options.version} · ${exemples.length} exemple(s) · température 0\n`,
);

const total = { entree: 0, sortie: 0, inconnus: 0 };
try {
  const ai = creerClient();

  // Une requête par ligne, l'une après l'autre (pas en parallèle : on ménage le quota gratuit).
  for (const [i, ligne] of lignes.entries()) {
    const reponse = await ai.models.generateContent({
      model: MODELE,
      contents: [...historiqueExemples, { role: 'user', parts: [{ text: ligne }] }],
      config: { temperature: 0, systemInstruction: prompt },
    });

    const texte = reponse.text?.trim() ?? '';
    const u = reponse.usageMetadata ?? {};
    total.entree += u.promptTokenCount ?? 0;
    total.sortie += u.candidatesTokenCount ?? 0;
    total.inconnus += (texte.match(/^INCONNU/gm) ?? []).length;

    console.log(`[${i + 1}] ${ligne}`);
    console.log(indenter(texte));
    console.log();
  }

  console.log('--- Total ---');
  console.log(
    `${lignes.length} ligne(s) · entrée ${total.entree} tokens · sortie ${total.sortie} tokens`,
  );
  console.log(`Mots signalés INCONNU : ${total.inconnus}`);
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}

function indenter(texte) {
  return texte
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
}
