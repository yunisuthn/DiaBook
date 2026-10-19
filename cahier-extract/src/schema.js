// Schéma JSON de sortie de l'extraction (utilisé comme "tool" forcé côté API Claude).
// Une photo = une "page" qui peut contenir des morceaux de plusieurs journées.

const confiance = { type: "number", minimum: 0, maximum: 1, description: "Confiance de lecture (0 à 1)" };
const montant = { type: ["integer", "null"], description: "Montant en Ariary, entier, sans séparateur. null si absent/illisible." };

export const PRODUITS = ["sable", "brique", "moellon", "gravillon", "bois", "demenagement", "autre", "inconnu"];
export const STATUTS = ["paye", "service", "en_attente", "inconnu"];
export const CATEGORIES_DEPENSE = [
  "repas", "gasoil", "dokera", "police", "motard", "croix", "ristourne",
  "achat_marchandise", "autre",
];
export const TYPES_MOUVEMENT = ["apport", "remise", "total_ecrit", "autre"];

export const pageSchema = {
  type: "object",
  required: ["qualite_photo", "journees", "remarques"],
  properties: {
    qualite_photo: {
      type: "object",
      required: ["lisibilite", "problemes"],
      properties: {
        lisibilite: { type: "string", enum: ["bonne", "moyenne", "mauvaise"] },
        problemes: { type: "array", items: { type: "string" }, description: "ex: ombre, angle, page coupée, flou" },
      },
    },
    journees: {
      type: "array",
      description: "Une entrée par bloc de date visible (ou par bloc sans date en haut de page).",
      items: {
        type: "object",
        required: ["date", "date_ecrite", "debut_coupe", "fin_coupee", "voyages", "depenses", "mouvements", "solde_ecrit"],
        properties: {
          date: { type: ["string", "null"], description: "AAAA-MM-JJ. null si la date n'est pas visible sur la photo." },
          date_ecrite: { type: ["string", "null"], description: "La date telle qu'écrite, ex '01-10-26'" },
          debut_coupe: { type: "boolean", description: "true si le bloc commence avant le haut de la photo" },
          fin_coupee: { type: "boolean", description: "true si le bloc continue après le bas de la photo" },
          voyages: {
            type: "array",
            items: {
              type: "object",
              required: ["numero", "produit", "produit_brut", "quantite", "unite", "origine", "destination", "montant", "retenue", "statut", "texte_brut", "confiance"],
              properties: {
                numero: { type: ["integer", "null"], description: "Numéro entouré. null si absent." },
                produit: { type: "string", enum: PRODUITS },
                produit_brut: { type: ["string", "null"] },
                quantite: { type: ["number", "null"] },
                unite: { type: ["string", "null"], description: "voyage | pieces" },
                pieces: { type: ["integer", "null"], description: "Nombre de pièces si indiqué (ex Isam-biriky 2500)" },
                origine: { type: ["string", "null"] },
                destination: { type: ["string", "null"] },
                montant: montant,
                retenue: { ...montant, description: "Somme déduite écrite sur la même ligne (ex '120000 - 50000' → 50000)" },
                statut: { type: "string", enum: STATUTS },
                texte_brut: { type: "string", description: "Transcription fidèle des lignes du voyage" },
                confiance,
                doutes: { type: "array", items: { type: "string" } },
              },
            },
          },
          depenses: {
            type: "array",
            items: {
              type: "object",
              required: ["categorie", "libelle_brut", "montant", "confiance"],
              properties: {
                categorie: { type: "string", enum: CATEGORIES_DEPENSE },
                libelle_brut: { type: "string" },
                montant: montant,
                confiance,
              },
            },
          },
          mouvements: {
            type: "array",
            description: "Argent ajouté à la caisse (apport), remis (remise), ou total intermédiaire écrit.",
            items: {
              type: "object",
              required: ["type", "libelle_brut", "montant"],
              properties: {
                type: { type: "string", enum: TYPES_MOUVEMENT },
                libelle_brut: { type: "string" },
                montant: montant,
              },
            },
          },
          solde_ecrit: { ...montant, description: "Le dernier 'Reste' / 'Reste vola' écrit pour la journée" },
          soldes_intermediaires: { type: "array", items: { type: "integer" } },
        },
      },
    },
    remarques: { type: "array", items: { type: "string" } },
  },
};

export const extractionTool = {
  name: "enregistrer_page",
  description: "Enregistre le contenu structuré d'une photo de page du cahier de bord.",
  input_schema: pageSchema,
};
