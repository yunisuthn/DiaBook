# Étape 2 — Le JSON imposé par l'API

Fichiers : [schemas/ligne.js](schemas/ligne.js) (le schéma), [prompts/journee.js](prompts/journee.js) (`PROMPT_JSON_IMPOSE`),
[scripts/json-impose.js](scripts/json-impose.js).

## L'idée : ne plus laisser le modèle choisir la forme

À l'étape 1, on **demandait** du JSON, et le modèle ajoutait parfois ` ```json `. Ici, on donne deux réglages à l'API :

```js
config: {
  responseMimeType: 'application/json', // la réponse est forcément du JSON, sans rien autour
  responseJsonSchema: SCHEMA_LIGNE,     // et ce JSON a forcément la forme décrite par le schéma
}
```

Pendant la génération, l'API **empêche** le modèle de choisir un token qui sortirait du schéma : pas de ` ``` `,
pas de champ inventé, pas de texte dans un champ « entier ». Ce n'est plus une consigne qu'il peut oublier,
c'est une **contrainte**.

## Le schéma (JSON Schema)

Un schéma décrit la forme d'un JSON. Extrait de [schemas/ligne.js](schemas/ligne.js) :

```js
type:    { type: 'string', enum: ['voyage', 'depense', 'mouvement', 'solde', 'inconnu'] },
numero:  { type: ['integer', 'null'], description: 'numéro du voyage, en chiffres ordinaires (⑦ → 7)' },
produit: { type: ['string', 'null'], enum: ['sable', 'brique', 'moellon', 'gravillon', 'bois', 'déménagement', null] },
statut:  { type: ['string', 'null'], enum: ['paye', 'paye_maison', 'en_attente', null] },
```

| Mot-clé                       | Sens                                                                  |
| ----------------------------- | --------------------------------------------------------------------- |
| `type: 'integer'`             | un nombre entier (les montants en Ariary)                             |
| `type: ['integer', 'null']`   | un entier **ou** `null` (information non écrite, ou champ sans objet) |
| `enum`                        | la liste des **seules** valeurs permises                              |
| `required`                    | les champs obligatoires                                               |
| `additionalProperties: false` | aucun autre champ accepté                                             |
| `description`                 | une explication **pour le modèle** : elle fait partie du prompt       |

Choix de conception : tous les éléments ont la **même forme « à plat »** (11 champs).
Un champ qui ne concerne pas l'élément vaut `null` : une dépense a `numero: null`, un voyage a `nature: null`.
C'est simple, mais le schéma ne peut pas dire « un voyage DOIT avoir un statut ». On verra mieux à l'étape 3.

Le prompt, lui, n'a plus besoin de **montrer** la forme du JSON. Il explique seulement le **sens** des champs.

## Résultats (`npm run json-impose -- --fois 2`, température 0)

**14 réponses sur 14 lisibles par `JSON.parse`**, sans rustine :

```
[1] ✅ type="voyage" numero=7 quantite=2 produit="sable" origine="Ampasika" destination="Ivato" montant=120000 retenue=50000 statut="paye"
[2] ✅ type="voyage" numero=8 … statut="paye_maison"
[3] ✅ type="voyage" numero=9 … montant=90000 statut="en_attente"
[4] ✅ 3 dépenses : repas 12000, gasoil 50000, chargeurs 15000
[5] ✅ type="solde" montant=113000
[6] ✅ type="mouvement" montant=100000 nature="apport"
[7] ✅ motard 5000, croix 2000, type="inconnu" montant=3000 texte="Kapoaka"
```

- Plus aucun ` ```json ` : `JSON.parse(reponse.text)` suffit.
- Les montants sont de vrais **nombres entiers**, les statuts sont **toujours** l'une des trois valeurs permises.
- Kapoaka garde son **montant** (3000) : le schéma prévoit un champ `montant` pour tous les éléments.

Test avec un produit hors du lexique, `* Tany 1vgs ⑩ Ivato -> Anosy Vola 50000` (« tany » = terre) :

```
✅ type="inconnu" texte="* Tany"
✅ type="voyage" numero=10 quantite=1 origine="Ivato" destination="Anosy" montant=50000 statut="paye"
```

Le produit vaut `null` et « Tany » est signalé inconnu : le modèle n'a pas choisi au hasard dans la liste,
parce que `null` faisait partie des valeurs permises.

## Ce qu'il faut retenir

1. **La forme est garantie par l'API**, plus par une consigne. C'est la méthode à utiliser en vrai.
2. Le schéma est aussi une **partie du prompt** : les noms de champs, les `enum` et les `description` guident le modèle.
3. **Le schéma garantit la forme, pas la vérité.** Un montant peut être un entier… faux (mal lu sur la photo).
   C'est pour ça que DiaBook garde le serveur qui recalcule et l'humain qui valide.
4. Il faut toujours une **porte de sortie** (`null`, `inconnu`) : sinon, l'API force le modèle à choisir une valeur
   de la liste, même quand aucune ne convient. C'est l'exercice de l'étape.
