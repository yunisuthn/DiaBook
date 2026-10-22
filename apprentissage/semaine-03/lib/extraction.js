// extraireJournee(ai, texte) : la fonction centrale de la semaine.
// Texte d'une page du cahier → objet journée VALIDÉ par Zod, ou erreur explicite.

import { z } from 'zod';
import { MODELE } from './gemini.js';
import { PROMPT_JOURNEE } from '../prompts/journee.js';
import { JourneeSchema, SCHEMA_JOURNEE_POUR_API } from '../schemas/journee-zod.js';

// Erreur levée quand la réponse du modèle ne passe pas la validation Zod.
// Elle garde la réponse brute : DiaBook conserve toujours le JSON brut de l'extraction.
export class ErreurExtraction extends Error {
  constructor(message, { brut }) {
    super(message);
    this.brut = brut;
  }
}

export async function extraireJournee(ai, texte) {
  const reponse = await ai.models.generateContent({
    model: MODELE,
    contents: texte,
    config: {
      temperature: 0,
      systemInstruction: PROMPT_JOURNEE,
      responseMimeType: 'application/json',
      responseJsonSchema: SCHEMA_JOURNEE_POUR_API,
    },
  });

  const brut = reponse.text ?? '';
  const u = reponse.usageMetadata ?? {};
  const usage = { entree: u.promptTokenCount ?? 0, sortie: u.candidatesTokenCount ?? 0 };

  let objet;
  try {
    objet = JSON.parse(brut);
  } catch (err) {
    throw new ErreurExtraction(`réponse qui n'est pas du JSON : ${err.message}`, { brut });
  }

  const resultat = JourneeSchema.safeParse(objet);
  if (!resultat.success) {
    throw new ErreurExtraction(z.prettifyError(resultat.error), { brut });
  }
  return { journee: resultat.data, brut, usage };
}
