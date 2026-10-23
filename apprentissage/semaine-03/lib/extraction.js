// extraireJournee(ai, texte) : la fonction centrale de la semaine.
// Texte d'une page du cahier → objet journée VALIDÉ par Zod, ou erreur explicite.
//
// Étape 5 : si la réponse est refusée, on RELANCE une fois, en renvoyant au modèle
// sa propre réponse ET le message d'erreur de Zod. Si c'est encore refusé, on abandonne
// et on signale : c'est à l'utilisateur de relire la page.
// Une journée acceptée peut porter des AVERTISSEMENTS (cahier incomplet) : voir lib/avertissements.js.

import { z } from 'zod';
import { MODELE } from './gemini.js';
import { PROMPT_JOURNEE } from '../prompts/journee.js';
import { JourneeSchema, SCHEMA_JOURNEE_POUR_API } from '../schemas/journee-zod.js';
import { avertissements } from './avertissements.js';

// Erreur levée quand la réponse du modèle ne passe pas la validation Zod.
// Elle garde la réponse brute : DiaBook conserve toujours le JSON brut de l'extraction.
// « tentatives » : chaque réponse refusée et son erreur (une par appel).
export class ErreurExtraction extends Error {
  constructor(message, { brut, tentatives = [] }) {
    super(message);
    this.brut = brut;
    this.tentatives = tentatives;
  }
}

// Le message ajouté à la conversation quand la réponse est refusée.
// On dit QUOI corriger, et on rappelle qu'il ne faut pas inventer pour « faire passer » la validation.
export function messageDeRelance(erreur) {
  return `
Ta réponse a été refusée par la validation :
${erreur}

Relis la page et renvoie la journée corrigée.
Ne devine rien pour faire disparaître l'erreur : une information qui n'est pas écrite sur la page reste null.
`.trim();
}

export async function extraireJournee(ai, texte, { relances = 1 } = {}) {
  // La conversation : la page, puis (en cas de refus) la réponse du modèle et notre message d'erreur.
  const contents = [{ role: 'user', parts: [{ text: texte }] }];
  const tentatives = [];
  const usage = { entree: 0, sortie: 0 };

  for (let appel = 1; appel <= 1 + relances; appel++) {
    const reponse = await ai.models.generateContent({
      model: MODELE,
      contents,
      config: {
        temperature: 0,
        systemInstruction: PROMPT_JOURNEE,
        responseMimeType: 'application/json',
        responseJsonSchema: SCHEMA_JOURNEE_POUR_API,
      },
    });

    const brut = reponse.text ?? '';
    const u = reponse.usageMetadata ?? {};
    usage.entree += u.promptTokenCount ?? 0;
    usage.sortie += u.candidatesTokenCount ?? 0;

    const { journee, erreur } = valider(brut, tentatives.at(-1)?.brut);
    if (journee) {
      return {
        journee,
        brut,
        usage,
        appels: appel,
        tentatives,
        avertissements: avertissements(journee),
      };
    }

    tentatives.push({ brut, erreur });
    contents.push(
      { role: 'model', parts: [{ text: brut }] },
      { role: 'user', parts: [{ text: messageDeRelance(erreur) }] },
    );
  }

  const derniere = tentatives.at(-1);
  throw new ErreurExtraction(
    `réponse refusée ${tentatives.length} fois, dernière erreur :\n${derniere.erreur}`,
    { brut: derniere.brut, tentatives },
  );
}

// JSON.parse puis Zod. Renvoie { journee } si tout va bien, sinon { erreur } (le message lisible).
// « brutRefuse » : la réponse refusée juste avant (après une relance), pour le garde-fou.
function valider(brut, brutRefuse) {
  let objet;
  try {
    objet = JSON.parse(brut);
  } catch (err) {
    return { erreur: `réponse qui n'est pas du JSON : ${err.message}` };
  }

  const resultat = JourneeSchema.safeParse(objet);
  if (!resultat.success) return { erreur: z.prettifyError(resultat.error) };

  // Garde-fou : une relance doit CORRIGER, pas faire disparaître des voyages pour passer la validation
  // (vu en vrai : le modèle avait changé un voyage en élément « inconnu »).
  const avant = compterVoyages(brutRefuse);
  const apres = compterVoyages(brut);
  if (apres < avant) {
    return {
      erreur: `la relance a fait disparaître ${avant - apres} voyage(s) (${avant} → ${apres})`,
    };
  }
  return { journee: resultat.data };
}

// Nombre de voyages dans une réponse brute ; 0 si elle n'est pas lisible.
function compterVoyages(brut) {
  try {
    return JSON.parse(brut).elements.filter((e) => e.type === 'voyage').length;
  } catch {
    return 0;
  }
}
