// Fait lire UNE ligne du cahier au modèle, avec une version du prompt « lecteur de cahier ».
// Partagé par scripts/lire.js et scripts/evaluer.js : la façon d'appeler le modèle est écrite une seule fois.

import { MODELE } from './gemini.js';
import { PROMPTS, EXEMPLES } from '../prompts/cahier.js';

export async function lireLigne(ai, version, ligne) {
  const prompt = PROMPTS[version];
  if (!prompt) throw new Error(`Version de prompt inconnue : ${version}`);

  // Si la version a des exemples (few-shot), ils passent avant la ligne, sous forme d'échanges
  // « user » (la ligne) → « model » (la réponse attendue). Ici, pas de risque de confusion :
  // il n'y a pas de conversation, seulement une ligne à lire.
  const exemples = (EXEMPLES[version] ?? []).flatMap(({ ligne: l, reponse }) => [
    { role: 'user', parts: [{ text: l }] },
    { role: 'model', parts: [{ text: reponse }] },
  ]);

  const reponse = await avecReessaisReseau(() =>
    ai.models.generateContent({
      model: MODELE,
      contents: [...exemples, { role: 'user', parts: [{ text: ligne }] }],
      config: { temperature: 0, systemInstruction: prompt },
    }),
  );

  const u = reponse.usageMetadata ?? {};
  return {
    texte: reponse.text?.trim() ?? '',
    entree: u.promptTokenCount ?? 0,
    sortie: u.candidatesTokenCount ?? 0,
  };
}

// Le SDK réessaie tout seul les erreurs HTTP (429, 503…), mais PAS les coupures réseau :
// si Internet décroche une seconde (EAI_AGAIN = adresse de Google introuvable), fetch échoue
// avant même d'atteindre Google. Sur une évaluation de 2 minutes, une seule coupure ferait tout perdre :
// on réessaie donc 3 fois, après 2 s puis 4 s.
const ERREURS_RESEAU = [
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNRESET',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
];

async function avecReessaisReseau(appel, essais = 3) {
  for (let essai = 1; ; essai += 1) {
    try {
      return await appel();
    } catch (err) {
      const coupureReseau = err instanceof TypeError && ERREURS_RESEAU.includes(err.cause?.code);
      if (!coupureReseau || essai >= essais) throw err;
      const pause = 2000 * 2 ** (essai - 1);
      console.error(`   (coupure réseau ${err.cause.code}, nouvel essai dans ${pause / 1000} s…)`);
      await new Promise((resolve) => setTimeout(resolve, pause));
    }
  }
}
