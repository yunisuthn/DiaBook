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

  const reponse = await ai.models.generateContent({
    model: MODELE,
    contents: [...exemples, { role: 'user', parts: [{ text: ligne }] }],
    config: { temperature: 0, systemInstruction: prompt },
  });

  const u = reponse.usageMetadata ?? {};
  return {
    texte: reponse.text?.trim() ?? '',
    entree: u.promptTokenCount ?? 0,
    sortie: u.candidatesTokenCount ?? 0,
  };
}
