// Conversation sur plusieurs tours avec le lecteur de cahier, dans le terminal.
//
// Usage :
//   npm run discuter                      → avec mémoire : l'historique est renvoyé à chaque tour
//   npm run discuter -- --sans-memoire    → sans mémoire : seul le dernier message est envoyé
//
// Pendant la conversation, tape :
//   une ligne du cahier            → le modèle la lit
//   Correction : …                 → le modèle corrige une ligne déjà lue
//   Question : …                   → le modèle répond à partir des lignes déjà lues
//   /historique                    → affiche ce qui est renvoyé au modèle
//   /oublier                       → vide l'historique (nouvelle page)
//   /quitter                       → termine (ou Ctrl+C)

import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { creerClient, expliquerErreur, MODELE } from '../lib/gemini.js';
import { PROMPT_CONVERSATION, EXEMPLES } from '../prompts/cahier.js';

const { values: options } = parseArgs({
  options: { 'sans-memoire': { type: 'boolean', default: false } },
});
const avecMemoire = !options['sans-memoire'];

// Les exemples few-shot de v2 sont écrits DANS le prompt système, et non envoyés comme de faux échanges :
// ainsi le modèle ne peut plus les confondre avec les lignes de la page.
const texteExemples = EXEMPLES.v2
  .map(({ ligne, reponse }) => `Ligne : ${ligne}\nRéponse :\n${reponse}`)
  .join('\n\n');
const instructions = `${PROMPT_CONVERSATION}

EXEMPLES (uniquement pour montrer le format : ils ne font pas partie de la page)
${texteExemples}`;

// L'historique de la conversation : c'est NOUS qui le gardons, pas le modèle.
// L'API est « sans état » : à chaque tour, on renvoie tout ce qui s'est dit.
let historique = [];
let tour = 0;
let entreeCumulee = 0;

const ai = creerClient();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log(
  `Lecteur de cahier · ${MODELE} · ${avecMemoire ? 'AVEC mémoire' : 'SANS mémoire'}\n` +
    'Tape une ligne du cahier, « Correction : … », « Question : … », /historique, /oublier ou /quitter.\n',
);
rl.setPrompt('vous › ');
rl.prompt();

for await (const saisieBrute of rl) {
  const saisie = saisieBrute.trim();

  if (!saisie) {
    rl.prompt();
    continue;
  }
  if (saisie === '/quitter') break;
  if (saisie === '/oublier') {
    historique = [];
    console.log('(historique vidé : nouvelle page)\n');
    rl.prompt();
    continue;
  }
  if (saisie === '/historique') {
    afficherHistorique();
    rl.prompt();
    continue;
  }

  const message = { role: 'user', parts: [{ text: saisie }] };
  // Ce qui part au modèle : (historique si mémoire) + le nouveau message.
  const contents = [...(avecMemoire ? historique : []), message];

  try {
    const reponse = await ai.models.generateContent({
      model: MODELE,
      contents,
      config: { temperature: 0, systemInstruction: instructions },
    });
    const texte = reponse.text?.trim() ?? '';
    const u = reponse.usageMetadata ?? {};
    tour += 1;
    entreeCumulee += u.promptTokenCount ?? 0;

    console.log(`modèle › ${texte.replaceAll('\n', '\n         ')}`);
    console.log(
      `         (tour ${tour} · entrée ${u.promptTokenCount ?? 0} tokens · ` +
        `sortie ${u.candidatesTokenCount ?? 0} · entrée cumulée ${entreeCumulee} · ` +
        `historique ${historique.length + (avecMemoire ? 2 : 0)} messages)\n`,
    );

    // On n'ajoute à l'historique qu'en cas de succès : question ET réponse, dans l'ordre.
    if (avecMemoire) historique.push(message, { role: 'model', parts: [{ text: texte }] });
  } catch (err) {
    console.error(`❌ ${expliquerErreur(err)}\n`);
  }
  rl.prompt();
}

rl.close();
console.log('Au revoir.');

function afficherHistorique() {
  if (!avecMemoire) {
    console.log("(mode sans mémoire : aucun historique n'est renvoyé)\n");
    return;
  }
  console.log(`--- Historique renvoyé à chaque tour (${historique.length} messages) ---`);
  for (const { role, parts } of historique) {
    console.log(
      `${role === 'user' ? 'vous  ' : 'modèle'} : ${parts[0].text.replaceAll('\n', ' | ')}`,
    );
  }
  console.log();
}
