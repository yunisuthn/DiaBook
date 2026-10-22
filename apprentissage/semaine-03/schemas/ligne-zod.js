// Étape 3 — Le schéma d'une ligne, écrit UNE SEULE FOIS avec Zod.
// Il sert deux fois :
//   1. converti en JSON Schema (z.toJSONSchema) → donné à l'API pour imposer la forme de la réponse ;
//   2. utilisé dans notre code (safeParse) → vérifie le CONTENU, y compris des règles que l'API ne sait pas imposer.
//
// Zod est la bibliothèque de validation de l'application DiaBook (« Zod pour toutes les entrées », CLAUDE.md).

import { z } from 'zod';

// Messages d'erreur de Zod en français (« Entrée invalide : nombre attendu… »).
z.config(z.locales.fr());

// Un montant en Ariary : entier, jamais négatif, ou null s'il n'est pas écrit.
const montant = z.int().nonnegative().nullable();

// Chaque type d'élément a SA forme : un voyage a un statut, une dépense n'en a pas.
// (À l'étape 2, tous les éléments avaient les mêmes 11 champs, dont beaucoup à null.)
const Voyage = z
  .object({
    type: z.literal('voyage'),
    numero: z
      .int()
      .positive()
      .nullable()
      .describe('numéro du voyage en chiffres ordinaires (⑦ → 7)'),
    quantite: z.int().positive().describe('nombre de voyages (« 2vgs » → 2)'),
    produit: z
      .enum(['sable', 'brique', 'moellon', 'gravillon', 'bois', 'déménagement'])
      .nullable()
      .describe('null si le produit est absent du lexique'),
    origine: z.string().nullable(),
    destination: z.string().nullable(),
    montant: montant.describe('montant écrit, en Ariary'),
    retenue: montant.describe('retenue (« 120000 - 50000 » → 50000), null s’il n’y en a pas'),
    statut: z.enum(['paye', 'paye_maison', 'en_attente']),
  })
  // Règles « métier » qu'un JSON Schema ne sait pas exprimer : Zod les vérifie dans notre code.
  .refine((v) => v.statut !== 'paye' || v.montant !== null, {
    message: 'un voyage payé doit avoir un montant',
    path: ['montant'],
  })
  .refine((v) => v.retenue === null || (v.montant !== null && v.retenue <= v.montant), {
    message: 'la retenue ne peut pas dépasser le montant',
    path: ['retenue'],
  });

const Depense = z.object({
  type: z.literal('depense'),
  nature: z.string().min(1).describe('en français : repas, gasoil, chargeurs, police…'),
  montant,
});

const Mouvement = z.object({
  type: z.literal('mouvement'),
  nature: z.enum(['apport', 'total', 'autre']),
  montant,
});

const Solde = z.object({
  type: z.literal('solde'),
  montant: montant.describe('le « Reste » écrit'),
});

const Inconnu = z.object({
  type: z.literal('inconnu'),
  texte: z.string().min(1).describe('le mot hors lexique, tel qu’écrit'),
  montant: montant.describe('le nombre qui suit le mot, s’il y en a un'),
});

// « discriminatedUnion » : la valeur du champ « type » dit quelle forme vérifier.
export const ElementSchema = z.discriminatedUnion('type', [
  Voyage,
  Depense,
  Mouvement,
  Solde,
  Inconnu,
]);

export const LigneSchema = z.object({
  elements: z.array(ElementSchema),
});

// Conversion pour l'API. On retire « $schema » : c'est une simple étiquette de version,
// inutile pour Gemini.
const { $schema, ...jsonSchema } = z.toJSONSchema(LigneSchema);
export const SCHEMA_LIGNE_POUR_API = jsonSchema;
