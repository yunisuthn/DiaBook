// Étape 4 — Le schéma d'une JOURNÉE (une page du cahier).
// Une journée, c'est : une date + tous les éléments de ses lignes.
// On réutilise ElementSchema de l'étape 3 : les règles sur les voyages s'appliquent donc aussi ici.

import { z } from 'zod';
import { ElementSchema } from './ligne-zod.js';

export const JourneeSchema = z
  .object({
    date_ecrite: z
      .string()
      .nullable()
      .describe('la date telle qu’elle est écrite sur la page (ex. « 28-09-26 »), null si absente'),
    date: z.iso
      .date()
      .nullable()
      .describe('la même date au format AAAA-MM-JJ (années à 2 chiffres = 20xx), null si absente'),
    elements: z
      .array(ElementSchema)
      .describe('tous les éléments de toutes les lignes, dans l’ordre de la page'),
  })
  // Règle sur la journée entière : un seul « Reste » écrit par page.
  .refine((j) => j.elements.filter((e) => e.type === 'solde').length <= 1, {
    message: 'une journée ne peut avoir qu’un seul « Reste » écrit',
    path: ['elements'],
  });

// Conversion pour l'API (sans l'étiquette « $schema »).
const { $schema, ...jsonSchema } = z.toJSONSchema(JourneeSchema);
export const SCHEMA_JOURNEE_POUR_API = jsonSchema;

// Range les éléments par type : plus pratique pour afficher, compter, et plus tard calculer le solde.
export function regrouper(journee) {
  const deType = (type) => journee.elements.filter((e) => e.type === type);
  return {
    date: journee.date,
    voyages: deType('voyage'),
    depenses: deType('depense'),
    mouvements: deType('mouvement'),
    reste: deType('solde')[0]?.montant ?? null,
    inconnus: deType('inconnu'),
  };
}
