// Schéma de sortie de l'extraction (repris de cahier-extract/src/schema.js).
// Une photo = une « page » qui peut contenir des morceaux de plusieurs journées.
// Le schéma Zod est la source unique : il valide la sortie du modèle, donne les types TypeScript
// et produit le JSON Schema de l'outil enregistrer_page.
import { z } from 'zod';

export const PRODUITS = [
  'sable',
  'brique',
  'moellon',
  'gravillon',
  'bois',
  'demenagement',
  'autre',
  'inconnu',
] as const;
export const STATUTS = ['paye', 'service', 'en_attente', 'inconnu'] as const;
export const CATEGORIES_DEPENSE = [
  'repas',
  'gasoil',
  'dokera',
  'police',
  'motard',
  'croix',
  'ristourne',
  'achat_marchandise',
  'autre',
] as const;
export const TYPES_MOUVEMENT = ['apport', 'remise', 'total_ecrit', 'autre'] as const;

const confiance = z.number().min(0).max(1).describe('Confiance de lecture (0 à 1)');
const montant = () =>
  z
    .number()
    .int()
    .nullable()
    .describe('Montant en Ariary, entier, sans séparateur. null si absent/illisible.');

const schemaVoyage = z.object({
  numero: z.number().int().nullable().describe('Numéro entouré. null si absent.'),
  produit: z.enum(PRODUITS),
  produit_brut: z.string().nullable(),
  quantite: z.number().nullable(),
  unite: z.string().nullable().describe('voyage | pieces'),
  pieces: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Nombre de pièces si indiqué (ex Isam-biriky 2500)'),
  origine: z.string().nullable(),
  destination: z.string().nullable(),
  montant: montant(),
  retenue: montant().describe(
    "Somme déduite écrite sur la même ligne (ex '120000 - 50000' → 50000)",
  ),
  statut: z.enum(STATUTS),
  texte_brut: z.string().describe('Transcription fidèle des lignes du voyage'),
  confiance,
  doutes: z.array(z.string()).optional(),
});

const schemaDepense = z.object({
  categorie: z.enum(CATEGORIES_DEPENSE),
  libelle_brut: z.string(),
  montant: montant(),
  confiance,
});

const schemaMouvement = z.object({
  type: z.enum(TYPES_MOUVEMENT),
  libelle_brut: z.string(),
  montant: montant(),
});

const schemaJournee = z.object({
  date: z
    .string()
    .nullable()
    .describe("AAAA-MM-JJ. null si la date n'est pas visible sur la photo."),
  date_ecrite: z.string().nullable().describe("La date telle qu'écrite, ex '01-10-26'"),
  debut_coupe: z.boolean().describe('true si le bloc commence avant le haut de la photo'),
  fin_coupee: z.boolean().describe('true si le bloc continue après le bas de la photo'),
  voyages: z.array(schemaVoyage),
  depenses: z.array(schemaDepense),
  mouvements: z
    .array(schemaMouvement)
    .describe('Argent ajouté à la caisse (apport), remis (remise), ou total intermédiaire écrit.'),
  solde_ecrit: montant().describe("Le dernier 'Reste' / 'Reste vola' écrit pour la journée"),
  soldes_intermediaires: z.array(z.number().int()).optional(),
});

export const schemaPage = z.object({
  qualite_photo: z.object({
    lisibilite: z.enum(['bonne', 'moyenne', 'mauvaise']),
    problemes: z.array(z.string()).describe('ex: ombre, angle, page coupée, flou'),
  }),
  journees: z
    .array(schemaJournee)
    .describe('Une entrée par bloc de date visible (ou par bloc sans date en haut de page).'),
  remarques: z.array(z.string()),
});

export type PageExtraite = z.infer<typeof schemaPage>;
export type JourneeExtraite = z.infer<typeof schemaJournee>;
export type VoyageExtrait = z.infer<typeof schemaVoyage>;
export type DepenseExtraite = z.infer<typeof schemaDepense>;
export type MouvementExtrait = z.infer<typeof schemaMouvement>;
export type ProduitExtrait = (typeof PRODUITS)[number];
export type StatutExtrait = (typeof STATUTS)[number];

type SchemaJson = Record<string, unknown>;

/**
 * Adapte le JSON Schema produit par Zod au mode `strict` des outils :
 * `additionalProperties: false` sur chaque objet, valeurs nullables en `anyOf`, retrait des contraintes
 * non prises en charge
 * (bornes numériques, longueurs) - elles restent vérifiées par Zod à la réception.
 */
function adapterPourOutil(noeud: unknown): unknown {
  if (Array.isArray(noeud)) return noeud.map(adapterPourOutil);
  if (noeud === null || typeof noeud !== 'object') return noeud;
  const resultat: SchemaJson = {};
  for (const [cle, valeur] of Object.entries(noeud)) {
    if (
      [
        '$schema',
        'minimum',
        'maximum',
        'exclusiveMinimum',
        'exclusiveMaximum',
        'minLength',
        'maxLength',
      ].includes(cle)
    ) {
      continue;
    }
    resultat[cle] = adapterPourOutil(valeur);
  }
  if (resultat.type === 'object') resultat.additionalProperties = false;
  // « type: ['string', 'null'] » → « anyOf » : la forme documentée pour le mode strict.
  if (Array.isArray(resultat.type)) {
    const { type: types, ...reste } = resultat;
    return { ...reste, anyOf: (types as unknown[]).map((type) => ({ type })) };
  }
  return resultat;
}

export const NOM_OUTIL = 'enregistrer_page';

/** JSON Schema de l'entrée de l'outil enregistrer_page. */
export const schemaJsonPage = adapterPourOutil(
  z.toJSONSchema(schemaPage, { io: 'output' }),
) as SchemaJson & { type: 'object' };

export const outilEnregistrerPage = {
  name: NOM_OUTIL,
  description: "Enregistre le contenu structuré d'une photo de page du cahier de bord.",
  input_schema: schemaJsonPage,
};
