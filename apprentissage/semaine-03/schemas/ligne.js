// Étape 2 — Le SCHÉMA de la réponse, écrit à la main au format JSON Schema.
// On le donne à l'API (responseJsonSchema) : Gemini est alors OBLIGÉ de produire un JSON de cette forme.
//
// Lecture d'un schéma :
// - "type"      : le genre de valeur ("object", "array", "string", "integer"…) ;
// - ["integer", "null"] : un entier OU null (information non écrite) ;
// - "enum"      : la liste des seules valeurs permises ;
// - "required"  : les champs obligatoires ;
// - "additionalProperties": false : aucun autre champ n'est accepté.

// Un élément de la ligne. Tous les types d'éléments partagent la même forme « à plat » :
// les champs qui ne concernent pas un type valent null (ex. « numero » pour une dépense).
const ELEMENT = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['voyage', 'depense', 'mouvement', 'solde', 'inconnu'] },
    numero: {
      type: ['integer', 'null'],
      description: 'numéro du voyage, en chiffres ordinaires (⑦ → 7)',
    },
    quantite: { type: ['integer', 'null'], description: 'nombre de voyages (« 2vgs » → 2)' },
    produit: {
      type: ['string', 'null'],
      enum: ['sable', 'brique', 'moellon', 'gravillon', 'bois', 'déménagement', null],
    },
    origine: { type: ['string', 'null'] },
    destination: { type: ['string', 'null'] },
    montant: { type: ['integer', 'null'], description: 'en Ariary, recopié tel quel' },
    retenue: { type: ['integer', 'null'], description: 'en Ariary (« 120000 - 50000 » → 50000)' },
    statut: { type: ['string', 'null'], enum: ['paye', 'paye_maison', 'en_attente', null] },
    nature: {
      type: ['string', 'null'],
      description: 'dépense : repas, gasoil, chargeurs… ; mouvement : apport, total ou autre',
    },
    texte: {
      type: ['string', 'null'],
      description: 'pour un élément inconnu : le mot tel qu’écrit',
    },
  },
  required: [
    'type',
    'numero',
    'quantite',
    'produit',
    'origine',
    'destination',
    'montant',
    'retenue',
    'statut',
    'nature',
    'texte',
  ],
  additionalProperties: false,
};

export const SCHEMA_LIGNE = {
  type: 'object',
  properties: {
    elements: { type: 'array', items: ELEMENT },
  },
  required: ['elements'],
  additionalProperties: false,
};
