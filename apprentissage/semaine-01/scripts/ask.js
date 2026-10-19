// Pose une question au LLM depuis le terminal.
//
// Usage :
//   node scripts/ask.js "ma question"                 réponse d'un bloc (version 1)
//   node scripts/ask.js "ma question" --stream        réponse au fur et à mesure (version 2)
//   node scripts/ask.js "ma question" --temp 0.2      température choisie (0 à 2 chez Gemini)
//   node scripts/ask.js "ma question" --model gemini-3.5-flash
//
// En mode --stream, Ctrl+C interrompt proprement la génération.

import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';

// --- 1. Lire les arguments de la ligne de commande ------------------------------
// parseArgs est intégré à Node : pas besoin de commander ou yargs pour si peu.
const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    temp: { type: 'string' }, // les valeurs arrivent toujours en texte : on convertit après
    stream: { type: 'boolean', default: false },
    model: { type: 'string', default: MODELE },
  },
});

const question = positionals.join(' ').trim();
if (!question) {
  console.error('Usage : node scripts/ask.js "ta question" [--temp 0.2] [--stream] [--model id]');
  process.exit(1);
}

// --- 2. Préparer la configuration de génération ---------------------------------
const config = {};
if (options.temp !== undefined) {
  const temperature = Number(options.temp);
  if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
    console.error('❌ --temp doit être un nombre entre 0 et 2 (ex. --temp 0.2).');
    process.exit(1);
  }
  config.temperature = temperature;
}

// Un AbortController permet d'annuler une requête en cours.
// C'est le même mécanisme qu'utilisera le bouton « Stop » de la page React (étape 4).
const annulation = new AbortController();
config.abortSignal = annulation.signal;
process.on('SIGINT', () => annulation.abort()); // SIGINT = Ctrl+C

const requete = { model: options.model, contents: question, config };

// --- 3. Appeler le modèle --------------------------------------------------------
console.log(
  `→ ${options.model} · température ${config.temperature ?? 'par défaut (1)'} · ` +
    (options.stream ? 'streaming' : "d'un bloc") +
    '\n',
);
//node scripts/ask.js "Invente un nom pour un camion de sable." --temp 0
const debut = Date.now();
try {
  const usage = options.stream ? await repondreEnStreaming() : await repondreDUnBloc();
  afficherConsommation(usage);
} catch (err) {
  if (annulation.signal.aborted) {
    console.log('\n\n⏹  Interrompu (Ctrl+C).');
    process.exitCode = 130;
  } else {
    console.error(`\n❌ ${expliquerErreur(err)}`);
    process.exitCode = 1;
  }
}

// Version 1 : on attend la réponse complète, puis on l'affiche d'un coup.
async function repondreDUnBloc() {
  const reponse = await ai().models.generateContent(requete);
  console.log(reponse.text);
  return { usage: reponse.usageMetadata, premierMorceauMs: null };
}

// Version 2 : on affiche chaque morceau (chunk) dès qu'il arrive.
async function repondreEnStreaming() {
  const flux = await ai().models.generateContentStream(requete);
  let usage;
  let premierMorceauMs = null;

  // Le flux est un « itérable asynchrone » : for await attend le morceau suivant.
  for await (const morceau of flux) {
    if (morceau.text) {
      premierMorceauMs ??= Date.now() - debut;
      // process.stdout.write n'ajoute pas de retour à la ligne, contrairement à console.log.
      process.stdout.write(morceau.text);
    }
    // Le décompte de tokens arrive avec les derniers morceaux : on garde le plus récent.
    if (morceau.usageMetadata) usage = morceau.usageMetadata;
  }
  console.log();
  return { usage, premierMorceauMs };
}

function afficherConsommation({ usage = {}, premierMorceauMs }) {
  console.log('\n--- Consommation ---');
  console.log(`Entrée (prompt)     : ${usage.promptTokenCount ?? 0} tokens`);
  console.log(`Sortie (réponse)    : ${usage.candidatesTokenCount ?? 0} tokens`);
  console.log(`Réflexion (thinking): ${usage.thoughtsTokenCount ?? 0} tokens`);
  if (premierMorceauMs !== null) {
    console.log(`Premier morceau     : ${(premierMorceauMs / 1000).toFixed(1)} s`);
  }
  console.log(`Durée totale        : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
}

// Le client est créé à la demande : une clé manquante devient une erreur gérée plus haut.
function ai() {
  return creerClient();
}
