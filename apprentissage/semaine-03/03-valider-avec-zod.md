# Étape 3 — Valider le contenu avec Zod

Fichiers : [schemas/ligne-zod.js](schemas/ligne-zod.js), [scripts/json-valide.js](scripts/json-valide.js).

## Pourquoi encore une vérification ?

À l'étape 2, l'API impose la **forme** du JSON. Il reste deux problèmes :

1. **Ce que le JSON Schema ne sait pas dire.** Exemple : « un voyage **payé** doit avoir un montant »,
   « la retenue ne peut pas dépasser le montant ». Ce sont des **règles métier** qui comparent deux champs.
2. **Ne jamais faire confiance à une donnée qui vient de l'extérieur.** La réponse d'un modèle est une donnée externe,
   comme ce que tape un utilisateur. DiaBook applique une règle simple : « Zod pour toutes les entrées » (`CLAUDE.md`).

## Un seul schéma, deux usages

On écrit le schéma **une seule fois**, en Zod ([schemas/ligne-zod.js](schemas/ligne-zod.js)) :

```
             ┌──────────── z.toJSONSchema() ───────────▶ responseJsonSchema (l'API impose la FORME)
LigneSchema ─┤
             └──────────── LigneSchema.safeParse() ────▶ dans notre code (vérifie le CONTENU)
```

Si on avait deux schémas (un JSON Schema pour l'API, un autre pour vérifier), ils finiraient par ne plus dire
la même chose. Avec une seule source, une modification s'applique partout.

## Ce qui s'améliore par rapport à l'étape 2

|                    | Étape 2 (JSON Schema à la main)        | Étape 3 (Zod)                                                                                 |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Forme d'un élément | 11 champs pour tous, beaucoup à `null` | **une forme par type** (`discriminatedUnion`) : un voyage a un statut, une dépense n'en a pas |
| Montants           | entier ou `null`                       | entier, **jamais négatif**, ou `null`                                                         |
| Règles métier      | impossibles                            | `.refine()` : voyage payé ⇒ montant ; retenue ≤ montant                                       |
| Messages d'erreur  | —                                      | en français (`z.config(z.locales.fr())`)                                                      |

`discriminatedUnion('type', [...])` : la valeur du champ `type` dit quelle forme vérifier.
Le JSON Schema produit par Zod contient un `oneOf`, une liste de formes possibles, et Gemini l'accepte.

## Résultats (`npm run json-valide`)

### 1. Ce que Zod attrape (réponses fausses écrites à la main)

```
• montant écrit en texte → ❌ Entrée invalide : nombre attendu, chaîne de caractères reçu → at elements[0].montant
• statut qui n'existe pas → ❌ Option invalide : une valeur parmi "paye"|"paye_maison"|"en_attente" attendue
• voyage payé sans montant (règle métier) → ❌ un voyage payé doit avoir un montant → at elements[0].montant
• retenue plus grande que le montant (règle métier) → ❌ la retenue ne peut pas dépasser le montant
```

Chaque erreur dit **quoi** et **où** (`elements[0].montant`). C'est exactement ce dont on aura besoin à l'étape 5,
pour renvoyer l'erreur au modèle et lui demander de corriger.

### 2. Les vraies réponses du modèle

**7/7 valides** selon Zod. Les éléments n'ont plus de champs inutiles :

```json
{"type":"depense","nature":"repas","montant":12000}
{"type":"inconnu","texte":"Kapoaka","montant":3000}
```

## Ce qu'il faut retenir

1. **L'API impose la forme, Zod vérifie le contenu.** Les deux sont nécessaires.
2. **Un seul schéma** : on écrit en Zod, on convertit pour l'API (`z.toJSONSchema`).
3. `safeParse` ne plante pas : il renvoie `{ success, data }` ou `{ success, error }`. Le programme décide quoi faire.
4. `resultat.data` est un objet **dont on est sûr** : c'est lui, et seulement lui, qu'on enregistrera plus tard.

## Exercice : une règle métier à toi

Nouvelle règle sur le voyage : **un voyage « en_attente » (Miandry vola) doit avoir un montant**,
sinon on ne sait pas combien le client doit.

```js
.refine((v) => v.statut !== 'en_attente' || v.montant !== null, {
  message: 'un voyage en attente doit avoir un montant (sinon on ne sait pas combien le client doit)',
  path: ['montant'],
})
```

Lecture : « soit le voyage n'est pas en attente, soit il a un montant ». Un `.refine()` renvoie `true` quand tout va bien.

| Test                                                  | Résultat                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| Réponse fausse : voyage `en_attente`, `montant: null` | ❌ refusé, avec **le bon message**, à `elements[0].montant` |
| Vraie ligne 3 (`Miandry vola 90000`)                  | ✅ acceptée                                                 |

### Les pièges rencontrés

1. **Condition inversée.** Un premier essai écrivait `v.montant == null` : la règle **exigeait** qu'un voyage en attente
   n'ait pas de montant, et aurait refusé la vraie ligne 3.
2. **Un test qui échoue pour la mauvaise raison.** Le premier cas de test était une copie du cas « retenue > montant » :
   il était bien refusé… par l'ancienne règle. Il faut **lire le message**, pas seulement voir ❌.
3. **`path`** désigne un **champ** de l'objet (`montant`), pas une valeur (`en_attente`).

**On teste toujours dans les deux sens :** une mauvaise donnée doit être refusée, et une bonne doit être acceptée.
