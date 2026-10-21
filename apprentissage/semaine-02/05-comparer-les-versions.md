# Étape 5 — Comparer les versions du prompt

Fichiers : [scripts/evaluer.js](scripts/evaluer.js), [donnees/attendus.js](donnees/attendus.js), [lib/lecteur.js](lib/lecteur.js).

## L'idée : juger un prompt sur des chiffres, pas sur une impression

Jusqu'ici, on lisait les réponses à l'œil. Avec 4 versions × 7 lignes, ça fait 28 réponses : trop pour être sûr de ne rien rater.
On écrit donc **ce qu'une bonne réponse doit contenir** ([donnees/attendus.js](donnees/attendus.js)),
et le programme note chaque version automatiquement.

| Pour chaque ligne                             | Exemple (ligne Fasika avec retenue)                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `doitContenir` : mots obligatoires            | `sable`, `ampasika`, `ivato`, `120000`, `50000`                                             |
| alternatives : l'une des deux suffit          | `['payé directement', 'maison']` pour le Service                                            |
| `interdits` : signes d'invention ou de calcul | `70000` (= 120000 − 50000, un calcul interdit) ; `boîte`, `conserve`, `mesure` pour Kapoaka |

Deux notes par version :

- **justes** : tout ce qui est attendu est présent, aucun mot interdit ;
- **format** : chaque ligne de réponse commence par une étiquette (`VOYAGE n°7 :`, `DÉPENSE :`…).

`lib/lecteur.js` contient désormais la seule fonction qui appelle le modèle (`lireLigne`) :
`lire.js` et `evaluer.js` l'utilisent tous les deux, et lisent donc les lignes exactement de la même façon.

## Résultats (`npm run evaluer`, `gemini-flash-lite-latest`, température 0)

| Version                    |  Justes |  Format | Entrée (tokens) | Sortie (tokens) |
| -------------------------- | ------: | ------: | --------------: | --------------: |
| v0 (étape 1, phrase libre) |     2/7 |     0/7 |           2 254 |             204 |
| v1 (lexique complet)       |     6/7 |     4/7 |           5 936 |             230 |
| v1_1 (ton exercice)        | **7/7** | **7/7** |           6 237 |             240 |
| v2 (v1_1 + 4 exemples)     | **7/7** | **7/7** |           7 854 |             223 |

- **v0** : sans lexique, le modèle recopie les lignes de dépenses telles quelles, et comprend « Vola tany an-trano »
  comme « montant payé pour _tany an-trano_ » : une **invention**.
- **v1** : échoue sur le Service (il écrit « gratuit », l'ancienne règle) ; 3 réponses hors format, à cause du numéro « ⑦ ».
- **v1_1** et **v2** : parfaites sur ces critères.

**Critère de réussite de la semaine** (« sur 5 lignes, aucun mot malagasy n'est inventé ») : ✅ atteint par v1_1 et v2,
sur 7 lignes.

## Leçon 1 : une évaluation ne mesure que ce qu'on vérifie

v1_1 et v2 ont la même note. Pourtant, à l'étape 3, on a **vu** que v2 écrit mieux : « 1 voyage » au lieu de
« 1 voyage(s) », « 50000 Ar » au lieu de « 50000Ar ». Nos critères ne vérifient pas ces détails, donc ils ne voient
pas la différence.

Avec ces critères, la décision rationnelle serait **v1_1** : même note, 21 % de tokens d'entrée en moins.
Si la régularité du format compte (et elle comptera quand un programme lira les réponses), il faut **l'ajouter aux critères** :
c'est l'exercice de l'étape. On approfondira en semaine 6 (évaluer la qualité).

## Leçon 2 : la limite de requêtes est une vraie contrainte

Le premier essai s'est arrêté net, sur une erreur 429 :
`Quota exceeded … limit: 15, model: gemini-3.5-flash-lite`. L'offre gratuite autorise **15 requêtes par minute**.
Les réessais automatiques du SDK (2 s puis 4 s) ne suffisent pas : Google demandait d'attendre 14 s.

Solution : **espacer les appels**. Le script attend 60 000 ms / 15 = 4 s entre deux requêtes (`--rpm 15`).
Les 28 appels prennent environ 2 min 30 au lieu de 30 s, mais ils vont jusqu'au bout.
On reverra ce problème à plus grande échelle en semaine 10 (file d'attente des extractions).
