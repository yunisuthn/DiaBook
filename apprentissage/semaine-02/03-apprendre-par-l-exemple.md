# Étape 3 — Apprendre par l'exemple (few-shot)

Fichiers : [prompts/cahier.js](prompts/cahier.js) (version `v2` et `EXEMPLES`), [scripts/lire.js](scripts/lire.js).

## L'idée

Jusqu'ici, on **décrivait** au modèle ce qu'on voulait : un lexique, des règles, un modèle de format.
Le _few-shot_ consiste à lui **montrer** quelques exemples terminés : « pour cette ligne, voici la réponse attendue ».

| Nom         | Ce qu'on donne au modèle                                   |
| ----------- | ---------------------------------------------------------- |
| _zero-shot_ | des instructions seulement (v0, v1, v1_1)                  |
| _few-shot_  | des instructions **+ quelques exemples** (v2 : 4 exemples) |

Un exemple montre d'un coup des dizaines de petits détails qu'il serait pénible de décrire en règles :
l'espace avant « Ar », « 1 voyage » au singulier, comment écrire un montant absent…

## Comment on envoie les exemples

On les envoie comme une **conversation qui aurait déjà eu lieu** : le modèle « voit » qu'il a déjà répondu
quatre fois, correctement, puis arrive la vraie ligne.

```js
contents: [
  { role: 'user', parts: [{ text: '* Hazo 1vgs ⑫ … Vola 80000 - 10000Ar' }] }, // exemple 1
  { role: 'model', parts: [{ text: 'VOYAGE n°12 : 1 voyage de bois, …, payé' }] }, // réponse attendue
  // … exemples 2 à 4 …
  { role: 'user', parts: [{ text: '<la vraie ligne à lire>' }] },
];
```

Les rôles sont `user` (ce qu'on envoie) et `model` (ce que le modèle a répondu). C'est exactement la même
structure qu'une vraie conversation : on l'utilisera pour l'historique à l'étape 4.

## Une seule chose change à la fois

`v2` a **exactement les mêmes instructions** que `v1_1` (`const v2 = v1_1`). Seuls les exemples sont ajoutés.
Si le résultat change, on sait que c'est grâce aux exemples. C'est la méthode de base de toute expérience,
et on la réutilisera pour évaluer les prompts en semaine 6.

## Choisir de bons exemples

1. **Différents des lignes de test.** Si un exemple est identique à une ligne de test, le modèle recopie la réponse :
   le test ne mesure plus rien. Nos exemples utilisent Hazo, Moellon, Police, Total vola, qui ne sont pas dans `donnees/lignes.js`.
2. **Variés, et centrés sur les cas difficiles** : retenue, Service, mot inconnu (« Lamba »), total écrit.
3. **Parfaitement justes.** Le modèle imite ce qu'il voit, y compris les erreurs.
4. **Peu nombreux** : chaque exemple est renvoyé à chaque appel, et il coûte des tokens d'entrée.

## Résultats : v1_1 (sans exemples) contre v2 (4 exemples)

| Détail                                | v1_1                         | v2                        |
| ------------------------------------- | ---------------------------- | ------------------------- |
| Retenue                               | `retenue 50000Ar`            | `retenue 50000 Ar`        |
| Quantité                              | `1 voyage(s)`, `2 voyage(s)` | `1 voyage`, `2 voyages`   |
| Montant absent (Service)              | `non écrit Ar`               | `montant non écrit`       |
| Numéros, statuts, dépenses, `INCONNU` | ✅                           | ✅ identiques             |
| Tokens d'entrée (7 lignes)            | 6 237                        | 7 854 (+ ≈ 230 par ligne) |
| Tokens de sortie (7 lignes)           | 232                          | 223                       |

Le contenu était déjà juste avec v1_1. Les exemples ont rendu la **forme** parfaitement régulière.
C'est important pour la suite : un programme devra lire ces réponses, et une forme régulière se lit sans surprise.

Le prix : environ 230 tokens d'entrée de plus par ligne. Encore une raison de passer, plus tard, à **une page entière par appel**
au lieu d'une ligne.
