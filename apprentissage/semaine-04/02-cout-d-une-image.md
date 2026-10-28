# Étape 2 — Ce que coûte une image, et comment la préparer

Fichiers : [scripts/cout-image.js](scripts/cout-image.js), [lib/image.js](lib/image.js) (`preparerImage`),
[lib/comparaison.js](lib/comparaison.js) (`comparerNombres`), [scripts/photo.js](scripts/photo.js)
(`--resolution`, `--preparer`), [lib/extraction.js](lib/extraction.js) (option `resolution`).

## L'énigme de l'étape 1

Une image de 1318 px et une de 1813 px coûtaient presque le même prix (1 064 et 1 083 tokens).
On a mesuré pour comprendre. Le modèle derrière `gemini-flash-lite-latest` est **`gemini-3.5-flash-lite`**
(champ `modelVersion` de la réponse).

## 1. La taille en pixels ne change pas le prix

`npm run cout-image`, partie 1 : la même page, J07, à 6 tailles, comptée avec `countTokens`.
`countTokens` compte les tokens **sans rien générer**, ce qui permet de mesurer sans consommer de réponse.

| Taille         | Fichier |    Tokens |
| -------------- | ------: | --------: |
| 3600 × 1455 px |  742 Ko |     1 093 |
| 1683 × 680 px  |   94 Ko |     1 093 |
| 800 × 323 px   |   74 Ko |     1 093 |
| 384 × 155 px   |   26 Ko |     1 093 |
| 64 × 26 px     |    2 Ko | **1 093** |

Le modèle **ramène toute image à un budget fixe** de tokens. Une vignette de 64 px, illisible, coûte autant qu'une
grande photo. **Réduire l'image ne fait pas baisser le prix chez Gemini.**

## 2. Ce qui change le prix : la résolution demandée

Le budget se choisit avec `mediaResolution` dans la configuration de l'appel
(nouvelle option `resolution` de `extraireJournee`, `--resolution` de `npm run photo`) :

| Résolution              | Tokens d'une image | 11 pages (`npm run photo -- --toutes`)       |
| ----------------------- | -----------------: | -------------------------------------------- |
| `LOW`                   |              ≈ 260 | **11/11 conformes, tous les nombres justes** |
| `MEDIUM`                |              ≈ 550 | (J07 testée : conforme)                      |
| `HIGH` (par défaut ici) |            ≈ 1 080 | 11/11 conformes (étape 1)                    |

En `LOW`, les images des 11 pages coûtent **2 885 tokens** au lieu de 11 878 : **4 fois moins**.

⚠️ **Ce sont des pages tapées, nettes et bien cadrées** : le cas le plus facile. On ne choisira la résolution
de DiaBook qu'après l'avoir mesurée sur de **vraies pages écrites à la main** (étape 3). D'ici là, on garde `HIGH`.

**Comparaison avec Claude**, le fournisseur visé pour DiaBook : chez Claude, le prix d'une image **augmente avec ses
pixels**, jusqu'à environ 4 784 tokens pour une image de 2576 px de grand côté (modèles récents). La documentation
d'Anthropic conseille de **réduire l'image côté client** quand on n'a pas besoin de toute la finesse.
Ce qui est inutile chez Gemini fera donc économiser chez Claude : c'est une raison de plus de préparer l'image.

## 3. Un nouveau contrôle : tous les nombres

`comparerAttendu()` ne vérifie que la date, les compteurs et le Reste. Pendant les essais, un « Total vola 165000 »
a été lu **185000**. La journée était valide (Zod) et « conforme » (les compteurs étaient bons), mais elle était fausse.

`comparerNombres(journee, texte)` vérifie que **chaque nombre d'au moins 4 chiffres** du texte tapé se retrouve
dans les montants et les retenues lus, doublons compris :

```
≠ nombres : sur la page sans être lus [85000,15000], lus sans être sur la page [80000,10000]
```

C'est un outil de **test** : il a besoin du texte tapé de la page. En vrai, sans ce texte, c'est l'utilisateur qui
relit les montants, et le serveur qui recalcule le Reste (semaine 5).

## 4. Une page prise de loin : recadrer

Le budget de tokens est **réparti sur toute l'image**. Si la page n'occupe qu'un coin de la photo (prise de loin,
posée sur une table), l'écriture ne reçoit qu'une petite part du budget.

`npm run cout-image`, partie 2 : J07 réduite à 500 px, posée au milieu d'un fond de 4000 × 3000 px.

| Lecture                        | Tokens image | Résultat                                                        |
| ------------------------------ | -----------: | --------------------------------------------------------------- |
| `LOW`, telle quelle            |          266 | ❌ « 85000 - 15000 » lu « 80000 - 10000 » (et réponse valide !) |
| `LOW`, **préparée** (recadrée) |          260 | ✅ tous les nombres lus                                         |
| `HIGH`, telle quelle           |        1 064 | ✅ tous les nombres lus                                         |

**Recadrer sur la page** rend à l'écriture tout le budget : même en `LOW`, la lecture redevient juste,
pour **4 fois moins cher** que `HIGH` sur la photo brute.

Autre observation : la même image (page de 800 px de large) a été lue juste lors d'un essai, et avec une erreur lors
d'un autre. **Même à température 0, la lecture d'une image n'est pas parfaitement reproductible.**
Une seule mesure ne suffit pas pour conclure.

## 5. Préparer l'image : `preparerImage()`

[lib/image.js](lib/image.js), trois opérations sharp, dans cet ordre :

```js
sharp(entree)
  .rotate() // 1. redresse selon l'étiquette EXIF (un téléphone enregistre souvent la photo « couchée »)
  .trim() // 2. recadre : enlève le bord uniforme autour de la page
  .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }) // 3. grand côté ≤ 1600 px
  .jpeg({ quality: 85 });
```

- **`rotate()` sans argument** lit l'étiquette EXIF et tourne l'image en vrai. Sans ça, le modèle reçoit une page
  de travers, alors qu'elle paraît droite dans la galerie du téléphone.
- **`trim()`** enlève les bords d'une couleur proche de celle du coin en haut à gauche.
  ⚠️ Il ne marche que sur un **fond uni**. Une vraie table (bois, carrelage) n'est pas unie : `trim()` n'enlèvera rien.
  On verra à l'étape 3 ce que ça donne sur de vraies photos.
- **`fit: 'inside'`** garde les proportions ; **`withoutEnlargement`** n'agrandit jamais une petite image.
- **JPEG** : bien plus léger qu'un PNG pour une photo. Pour nos images de texte tapé, le PNG est déjà petit,
  et le JPEG n'y gagne rien (94 Ko → 100 Ko pour J07).

Le poids du fichier (`npm run cout-image -- --hors-ligne`, la photo prise de loin) :

| Image                     | Fichier | En base64 |
| ------------------------- | ------: | --------: |
| PNG 4000 × 3000           |  280 Ko |    374 Ko |
| JPEG 4000 × 3000          |   91 Ko |    121 Ko |
| préparée 500 × 202 (JPEG) |   19 Ko |     26 Ko |

Notre fond uni se compresse très bien. Une vraie photo de téléphone pèse plutôt **2 à 5 Mo** :
la préparation compte encore plus. Un fichier léger s'envoie plus vite (connexion mobile à Antananarivo),
prend moins de place dans le stockage (Cloudinary), et reste loin de la limite de 20 Mo d'un envoi `inlineData`.

## Ce qu'il faut retenir

1. **Chez Gemini, une image coûte un budget fixe** de tokens, choisi par `mediaResolution`
   (`LOW` ≈ 260, `MEDIUM` ≈ 550, `HIGH` ≈ 1 080), quelle que soit sa taille en pixels.
   **Chez Claude, c'est l'inverse** : le prix suit les pixels.
2. Le budget est réparti sur toute l'image : **recadrer sur la page** donne tout le budget à l'écriture.
3. **Préparer l'image** (`rotate` EXIF, recadrage, taille limitée, JPEG) : fichier léger, page droite,
   et moins cher le jour où on passe à Claude.
4. Une réponse **valide** peut contenir un **montant faux** : il faut un contrôle de **tous les nombres**,
   pas seulement des compteurs.
5. Une seule mesure ne suffit pas : la lecture d'une image **varie** d'un appel à l'autre, même à température 0.
6. Les pages tapées sont le cas facile : la résolution de DiaBook se choisira sur de **vraies pages manuscrites**.
