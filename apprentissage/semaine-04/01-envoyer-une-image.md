# Étape 1 — Envoyer une image au modèle

Fichiers : [scripts/fabriquer-images.js](scripts/fabriquer-images.js), [lib/extraction.js](lib/extraction.js),
[prompts/journee.js](prompts/journee.js) (`PROMPT_PHOTO`), [scripts/photo.js](scripts/photo.js).

## Des images de test, sans données réelles

Le dépôt est public : pas de vraies photos de cahier. [scripts/fabriquer-images.js](scripts/fabriquer-images.js)
**dessine** chaque journée inventée de la semaine 3 sur une page lignée, avec sharp :

1. on écrit la page en **SVG** (du XML qui décrit un dessin : un fond, des lignes, du texte) ;
2. `sharp(Buffer.from(svg)).png()` transforme ce dessin en pixels et l'enregistre en PNG.

C'est du texte **tapé** dans une image, pas encore de l'écriture à la main : on apprend d'abord à envoyer une image
dans un cas facile. Les vraies pages manuscrites viendront à l'étape 3.

**Piège rencontré :** la première version avait une largeur fixe (1400 px). Les lignes longues étaient **coupées**
au bord (« 120000 - 5… »). Le modèle ne peut pas lire ce qui n'est pas sur l'image, et le test aurait échoué
pour une mauvaise raison. La largeur est maintenant calculée à partir de la ligne la plus longue.
**Toujours regarder l'image qu'on envoie.**

## Envoyer l'image : `inlineData`

En semaine 3, le message était du texte : `{ text: "29-09-26\n* Gravillon…" }`.
Une image est une autre **partie** du message :

```js
{ inlineData: { mimeType: 'image/png', data: image.toString('base64') } }
```

- `image` est un `Buffer` : les octets du fichier, lus avec `readFile` ;
- **base64** transforme ces octets en texte (A–Z, a–z, 0–9, +, /), parce que la requête est du JSON ;
  le texte est environ 4/3 plus long que le fichier ;
- `mimeType` dit au modèle comment décoder : `image/png`, `image/jpeg`…

« En ligne » (`inline`) veut dire que l'image voyage **dans la requête** elle-même. C'est simple, mais limité à environ
20 Mo par requête : largement assez pour une photo de page.

## Le reste ne change pas

`extraireJournee(ai, page)` accepte maintenant le texte tapé **ou** une photo `{ image, mimeType }`.
Seules deux choses changent : la partie du message (`partieDeLaPage`) et le prompt.
Le **schéma**, la **validation Zod**, la **relance** et les **avertissements** sont exactement ceux de la semaine 3 :
c'est l'intérêt d'avoir une seule fonction d'extraction.

`PROMPT_PHOTO` reprend les mêmes blocs (rôle, lexique, règles) et ajoute ce qu'un texte tapé ne pose jamais comme
problème : **ce qui est illisible**.

- Un nombre qu'on ne lit pas avec certitude vaut `null` : ne pas le deviner.
- Un mot illisible est un élément `inconnu`, avec `?` à la place des lettres illisibles.

## Résultats (`npm run photo -- --toutes`)

**8 images sur 8 lues, valides et conformes à l'attendu** (J01 à J08). J09 à J11 n'ont pas pu être lues :
la connexion Internet a coupé (`ETIMEDOUT`). Kapoaka (J04) donne le même avertissement qu'avec le texte.

| J02 (6 lignes)   | Texte tapé (semaine 3) | Photo (1813 × 610 px) |
| ---------------- | ---------------------: | --------------------: |
| Tokens d'entrée  |                  1 084 |             **2 152** |
| dont l'image     |                      — |             **1 083** |
| Tokens de sortie |                    471 |                   471 |
| Résultat         |            ✅ conforme |           ✅ conforme |

- La partie **texte** de l'entrée (le prompt) est la même : ≈ 1 070 tokens.
- L'**image** ajoute ≈ 1 060 à 1 100 tokens : l'entrée **double**.
- La **sortie** est identique : le modèle produit le même JSON, il ne « voit » pas plus.

**Une observation à vérifier à l'étape 2 :** les images de 1318 × 470 px (J06) et de 1813 × 610 px (J02) coûtent
presque le même nombre de tokens (1 064 et 1 083). Le coût d'une image ne semble donc **pas proportionnel** à sa taille
en pixels. Comment le modèle compte-t-il une image ? Et que se passe-t-il si on la réduit ? C'est l'étape 2.

## Ce qu'il faut retenir

1. Une image est une **partie** du message (`inlineData`), à côté ou à la place du texte, encodée en **base64**.
2. **Une seule fonction d'extraction** : texte ou photo, le schéma, Zod, la relance et les avertissements ne changent pas.
3. Sur une photo, il faut dire au modèle quoi faire de l'**illisible** : `null` pour un nombre, `inconnu` pour un mot.
4. Une image se paie en **tokens d'entrée** : ici, autant que tout le prompt.
5. **Regarder l'image qu'on envoie** : une image coupée donne un test faux.
