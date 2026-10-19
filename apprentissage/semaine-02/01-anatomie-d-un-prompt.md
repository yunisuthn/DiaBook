# Étape 1 — Anatomie d'un prompt

En semaine 1, on envoyait au modèle **une phrase seule**. Le modèle devait alors tout deviner :
ce qu'on veut, dans quelle langue, sous quelle forme, ce que veulent dire les abréviations.
Et quand il devine, il invente.

Le **prompt engineering**, c'est l'art de donner au modèle tout ce dont il a besoin pour ne plus deviner.

## 1. Deux places pour le texte : système et utilisateur

|         | Instructions **système** (`systemInstruction`)                        | Message **utilisateur** (`contents`) |
| ------- | --------------------------------------------------------------------- | ------------------------------------ |
| Rôle    | le **cadre** : qui tu es, ce que tu fais, les règles                  | la **donnée** à traiter maintenant   |
| Change… | rarement (on le versionne comme du code)                              | à chaque appel                       |
| DiaBook | « Tu lis des cahiers de bord… voici le vocabulaire… réponds en JSON » | la photo de la page, ou une ligne    |

Pourquoi séparer les deux ?

- Le modèle accorde plus de poids aux instructions système : c'est sa « fiche de poste ».
- On réutilise le même cadre pour des centaines de lignes : on l'écrit une seule fois.
- **Sécurité** : la donnée (une ligne du cahier, plus tard une photo) n'est jamais confondue avec un ordre.
  On y reviendra en semaine 11 (injection de prompt).

## 2. Les cinq ingrédients d'un bon prompt

| Ingrédient      | Question à laquelle il répond             | Dans notre prompt                                              |
| --------------- | ----------------------------------------- | -------------------------------------------------------------- |
| **Rôle**        | Qui es-tu, dans quel univers ?            | « Tu aides à numériser des cahiers de camions à Antananarivo » |
| **Tâche**       | Qu'est-ce que je te demande, exactement ? | « Dis en français ce que signifie cette ligne »                |
| **Contexte**    | Que dois-tu savoir que tu ne sais pas ?   | le vocabulaire : vgs, Fasika, Biriky, ⑦, « A -> B », retenue…  |
| **Contraintes** | Qu'est-ce qui est interdit ?              | « N'invente rien », « ne calcule pas »                         |
| **Format**      | À quoi doit ressembler la réponse ?       | « Une phrase, texte brut, sans Markdown »                      |

Le plus important pour DiaBook, c'est le **contexte**. Le modèle ne connaît pas le jargon du cahier,
et ce qu'il ne sait pas, il l'invente (« Nitondra fasika », « vgs » en semaine 1).

## 3. Ce que l'expérience a montré (`npm run comparer`)

Même ligne, même modèle, température 0 :

| Ligne                                                     | A. Ligne seule                                                                                                                                     | B. Prompt construit          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `Fasika 2vgs ⑦ Ampasika -> Ivato Frais 120000 - 50000Ar`  | répond **en anglais** ; prend « Ivato Frais » pour un lieu ; **calcule** un « reste à payer » de 70 000 Ar qui n'existe pas ; 263 tokens de sortie | une phrase juste ; 43 tokens |
| `Biriky 1vgs (Service) ⑧ Manandriana -> Ambohitrimanjaka` | répond **en malagasy** et parle de **taxi-brousse**                                                                                                | une phrase juste ; 28 tokens |
| `Gravillon 1vgs ⑨ … Miandry vola 90000`                   | à peu près juste, mais 321 tokens avec titres et questions                                                                                         | une phrase ; 41 tokens       |

### Le paradoxe du coût

Le prompt construit coûte **10 fois plus de tokens d'entrée** (≈ 330 contre ≈ 30)…
mais **6 fois moins de tokens de sortie** (≈ 40 contre ≈ 260). Et la sortie est la plus chère.

Avec les prix de Claude Opus 5.5 (4 $ en entrée, 20 $ en sortie, par million de tokens), pour la ligne 1 :

- A : 33 × 4 + 263 × 20 = **5 392** millionièmes de dollar
- B : 331 × 4 + 43 × 20 = **2 184** millionièmes de dollar → **2,5 fois moins cher**, et juste.

**Un bon prompt est plus long, mais il coûte moins cher et répond mieux.**

### Les règles ne sont pas toujours suivies

Le prompt B dit : « si un mot n'est pas dans le vocabulaire, recopie-le suivi de (?) ».

- « (Service) » et « Miandry vola » ne sont pas dans le vocabulaire.
- Le modèle ne les a **pas** marqués « (?) » : il a utilisé ce qu'il croit savoir.
  Pour « Miandry vola », il avait raison… cette fois.

Leçon : une règle ne remplace pas un vocabulaire complet. C'est l'objet de l'étape 2.
