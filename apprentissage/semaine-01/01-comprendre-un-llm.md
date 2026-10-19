# Étape 1 — Comprendre ce qu'est un LLM

Un **LLM** (Large Language Model) est un programme qui, à partir d'un texte (et éventuellement d'images),
**prédit le morceau de texte suivant**, puis le suivant, puis le suivant… jusqu'à former une réponse.
Il ne « cherche » pas dans une base de données : il génère, morceau par morceau, ce qui lui semble
le plus plausible compte tenu de ce qu'il a lu pendant son entraînement et de ce que tu lui envoies.

Ces « morceaux » s'appellent des **tokens**. Presque tout (limites, coût, vitesse) se compte en tokens.

---

## 1. Le token

Un token est un **fragment de texte** : parfois un mot entier, souvent un bout de mot, un espace + un mot,
un signe de ponctuation ou un chiffre. Le modèle ne voit jamais des lettres, il voit une suite de numéros
de tokens.

Le découpage est appris statistiquement : **les mots fréquents dans les données d'entraînement**
(anglais, puis français…) tiennent en un seul token ; les mots rares sont coupés en plusieurs morceaux.

### Exemple en français

> Le chauffeur a livré du sable à Ambohipanja.

Découpage possible (illustratif — chaque modèle a son propre découpeur) :

```
[Le] [ chauff] [eur] [ a] [ livr] [é] [ du] [ sable] [ à] [ Amb] [oh] [ip] [anja] [.]
```

→ environ **14 tokens** pour 8 mots. Les mots courants passent bien ; le nom de lieu malgache est haché.

### Exemple en malagasy

> Nitondra fasika telo vgs tany Ambohipanja izahay.

```
[N] [it] [ond] [ra] [ fas] [ika] [ tel] [o] [ v] [gs] [ tany] [ Amb] [oh] [ip] [anja] [ iz] [ah] [ay] [.]
```

→ environ **19 tokens** pour 7 mots.

### Ce qu'il faut retenir

- **Règle d'ordre de grandeur** : en anglais ≈ 4 caractères par token ; en français un peu moins ;
  en malagasy, nettement moins (la langue est peu présente dans les données d'entraînement).
  **Le même contenu coûte donc plus cher en malagasy qu'en français.**
- Les **nombres** se découpent aussi : `120000` peut faire 2 ou 3 tokens. C'est une des raisons pour
  lesquelles un LLM peut se tromper dans un calcul — d'où la règle DiaBook : **le serveur vérifie les calculs**,
  pas l'IA.
- Les découpages ci-dessus sont des illustrations. Pour connaître le **vrai** nombre, on demande à l'API
  (`messages.countTokens`) : tu le feras à l'étape 3.

---

## 2. La fenêtre de contexte

C'est **tout ce que le modèle « voit » pendant un appel**, mesuré en tokens :

| Contenu                                        | Exemple DiaBook                                         |
| ---------------------------------------------- | ------------------------------------------------------- |
| Le prompt système (instructions permanentes)   | vocabulaire du cahier, format JSON attendu, lieux connus |
| L'historique des messages (questions/réponses) | en général un seul message pour une extraction          |
| Les images                                     | la photo de la page du cahier                           |
| La réponse en cours de génération              | le JSON des voyages, dépenses, mouvements               |
| La réflexion (thinking) du modèle              | le raisonnement interne avant de répondre                |

Points clés :

- **Le modèle n'a aucune mémoire entre deux appels.** L'API est « sans état » : si tu veux qu'il se
  souvienne de la page précédente, tu dois la renvoyer dans le contexte.
- **La taille est limitée** : 1 million de tokens pour Claude Opus 5.5, et au plus 128 000 tokens de réponse.
  C'est énorme… mais tout ce qui entre dans le contexte se **paie** et **ralentit** la réponse.
- **Plus le contexte est chargé, plus l'attention se dilue** : 50 photos dans un seul appel donneraient de
  moins bons résultats que 50 appels d'une photo chacun.
- **Une image coûte des tokens** : environ `largeur × hauteur / 750`. Une photo de 1 092 × 1 092 pixels ≈ 1 600 tokens.
  L'API réduit d'elle-même les très grandes images ; c'est pour cela que DiaBook prévoit `sharp` :
  redimensionner/recadrer **avant** l'envoi, sans perdre la lisibilité de l'écriture.

**Pourquoi ça compte pour DiaBook** : un appel = **une photo + les instructions + le JSON produit**.
Le prompt actuel du prototype (`cahier-extract/src/prompt.js` + `lieux.js`) fait environ 5 Ko, soit
≈ 1 500 tokens, envoyés **à chaque photo**. On apprendra plus tard à le mettre en cache.

---

## 3. La température (et top_p)

À chaque étape, le modèle calcule une **probabilité pour chaque token possible**. Il faut ensuite en choisir un :

- **temperature** (0 à 1) : règle le hasard du tirage.
  - Proche de **0** : il prend presque toujours le token le plus probable → réponses stables, prévisibles.
  - Proche de **1** : il ose des tokens moins probables → réponses plus variées, plus « créatives ».
- **top_p** (0 à 1) : on ne garde que les tokens les plus probables dont la somme atteint `top_p`
  (ex. 0,9 = on écarte les 10 % de choix les plus improbables), puis on tire parmi eux.

On n'en règle **qu'un seul à la fois** (certains modèles refusent les deux ensemble).

| Usage                                     | Réglage conseillé           | Pourquoi                                     |
| ----------------------------------------- | --------------------------- | -------------------------------------------- |
| Extraction de données (lire le cahier)    | température **0** (ou 0,1)  | on veut la même lecture à chaque fois        |
| Rédaction (résumé, message au propriétaire) | température **0,7 à 1**   | on veut un texte naturel et varié            |

Même à 0, la sortie n'est **pas garantie identique** à 100 % : il faut toujours valider (d'où l'écran de validation).

### ⚠️ Nuance importante en 2026

Les modèles les plus récents (**Claude Opus 5.5, Sonnet 5.5, Haiku 5.5**) **n'acceptent plus** `temperature`
ni `top_p` : l'API renvoie une erreur 400. Ces modèles réfléchissent avant de répondre (*thinking*),
et on pilote leur comportement autrement :

- par le **prompt** (instructions claires, exemples) ;
- par l'**effort** (`output_config.effort` : `low` → `max`), qui règle la profondeur de réflexion ;
- par les **sorties structurées** (on impose un schéma JSON) — idéal pour l'extraction.

Pour **expérimenter** la température à l'étape 3 (`--temp 0.2`), on utilisera donc un modèle plus ancien
qui l'accepte encore : **Claude Haiku 4.5** (`claude-haiku-4-5`), rapide et peu cher.

---

## 4. Le coût : tokens d'entrée vs tokens de sortie

On paie séparément :

- **les tokens d'entrée** (input) : tout ce que tu envoies (prompt, historique, images) ;
- **les tokens de sortie** (output) : tout ce que le modèle génère, **y compris sa réflexion (thinking)**.

**La sortie coûte 5 fois plus cher que l'entrée.** Tarifs (en dollars par million de tokens) :

| Modèle            | Entrée | Sortie |
| ----------------- | -----: | -----: |
| Claude Opus 5.5   |  4 $   |  20 $  |
| Claude Sonnet 5.5 |  2 $   |  10 $  |
| Claude Haiku 5.5  | 0,10 $ | 0,50 $ |
| Claude Haiku 4.5  |  1 $   |   5 $  |

Chaque réponse de l'API contient un objet `usage` avec `input_tokens` et `output_tokens` :
c'est ce qu'on affichera dans le script de l'étape 3.

### Calcul pour une page du cahier (ordre de grandeur, Opus 5.5)

| Poste                        | Tokens | Prix                       |
| ---------------------------- | -----: | -------------------------- |
| Photo                        |  1 600 |                            |
| Instructions                 |  1 500 |                            |
| **Entrée totale**            |  3 100 | 3 100 × 4 $ / 1 M = 0,012 $ |
| Réflexion + JSON produit     |  3 000 | 3 000 × 20 $ / 1 M = 0,060 $ |
| **Total**                    |        | **≈ 0,07 $ par page**      |

Remarque : c'est la **sortie** qui pèse le plus, alors qu'elle est plus courte que l'entrée.
Leviers d'économie (qu'on verra plus tard) : réponse JSON compacte, effort plus bas, cache du prompt,
modèle moins cher si la qualité de lecture suffit.

---

## Mini-quiz (réponds avant de regarder la suite)

1. La phrase « Nitondra fasika telo vgs » et sa traduction « Il a transporté trois voyages de sable »
   ont à peu près le même sens. Laquelle risque de consommer le plus de tokens **par mot**, et pourquoi ?
2. Tu as extrait la page du 28/09. Tu envoies ensuite la page du 29/09 en demandant « continue la numérotation
   des voyages d'hier ». Que se passe-t-il, et que dois-tu faire ?
3. Pour lire les montants d'un cahier avec un modèle qui accepte la température, tu choisis 0 ou 0,9 ?
   Et avec Claude Opus 5.5, comment rends-tu l'extraction fiable ?
4. Un appel consomme 4 000 tokens d'entrée et 1 000 tokens de sortie sur Opus 5.5.
   Lequel des deux postes coûte le plus cher ? Calcule les deux montants.
5. Pourquoi est-ce une bonne idée de redimensionner la photo avec `sharp` avant de l'envoyer à l'API,
   et quel est le risque si on la réduit trop ?

### Corrigé

1. **Le malagasy.** Il est peu présent dans les données d'entraînement : ses mots ne sont pas dans le
   « dictionnaire » du découpeur, donc ils sont coupés en plusieurs petits morceaux.
2. **Le modèle ne sait pas ce qu'est « hier ».** Chaque appel repart de zéro : il risque d'inventer un numéro.
   Il faut mettre l'information dans le contexte (ex. « le dernier voyage du 28/09 porte le n° 7 »).
   Dans DiaBook, c'est le serveur qui connaît ce numéro (base de données) et qui vérifie la continuité.
3. **Température 0** : on veut la même lecture à chaque fois. Avec Opus 5.5 (pas de température) :
   instructions précises, schéma JSON imposé (sorties structurées), puis vérification des calculs par le
   serveur et validation par l'utilisateur.
4. Entrée : 4 000 × 4 $ / 1 000 000 = **0,016 $**. Sortie : 1 000 × 20 $ / 1 000 000 = **0,020 $**.
   La sortie coûte plus cher alors qu'elle a 4 fois moins de tokens.
5. Moins de pixels = moins de tokens = **moins cher et plus rapide** (et l'API réduirait de toute façon les
   trop grandes images). Si on réduit trop, l'écriture devient illisible : erreurs sur les chiffres et les montants.

---

## Exercice à faire seul

Un camion produit environ **2 pages de cahier par jour**, 26 jours par mois.

1. Avec les ordres de grandeur ci-dessus, calcule le coût mensuel d'extraction pour **un camion**
   avec Opus 5.5, puis avec Haiku 5.5.
2. Même calcul pour une flotte de **15 camions**.
3. Convertis en Ariary (cherche le cours du dollar du jour) et dis si l'écart Opus/Haiku te paraît
   justifié, sachant qu'une erreur de lecture sur un montant oblige l'utilisateur à corriger à la main.
