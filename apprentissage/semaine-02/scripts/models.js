// Liste les modèles que ta clé peut utiliser pour générer du texte.
// Usage : npm run models

import { creerClient, expliquerErreur } from '../lib/gemini.js';

try {
  const ai = creerClient();

  // models.list() renvoie un « Pager » : les résultats arrivent page par page,
  // et « for await » se charge de demander les pages suivantes.
  const pager = await ai.models.list();
  const modeles = [];
  for await (const modele of pager) {
    // On ne garde que les modèles capables de répondre à un prompt texte.
    if (modele.supportedActions?.includes('generateContent')) modeles.push(modele);
  }

  console.table(
    modeles.map((m) => ({
      identifiant: m.name.replace('models/', ''), // à mettre dans GEMINI_MODEL
      nom: m.displayName,
      'contexte (tokens)': m.inputTokenLimit,
      'sortie max': m.outputTokenLimit,
      reflexion: m.thinking ? 'oui' : 'non',
    })),
  );
  console.log(
    `${modeles.length} modèles. Ceux de l'offre gratuite : voir « Rate Limit » dans AI Studio.`,
  );
} catch (err) {
  console.error(`❌ ${expliquerErreur(err)}`);
  process.exitCode = 1;
}
