# Étape 2 — Le prompt « lecteur de cahier » v1

Fichiers : [prompts/cahier.js](prompts/cahier.js) (les versions du prompt), [scripts/lire.js](scripts/lire.js) (les fait tourner).

## Ce qui change entre v0 et v1

|         | v0 (étape 1)                           | v1 (étape 2)                                                                                     |
| ------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Lexique | 6 mots                                 | **tout le vocabulaire du cahier** : produits, statuts, dépenses, mouvements, solde               |
| Règles  | « n'invente rien », « ne calcule pas » | 5 règles numérotées, dont « **même si tu crois connaître ce mot** »                              |
| Format  | une phrase libre                       | **une ligne étiquetée par élément** : `VOYAGE`, `DÉPENSE`, `MOUVEMENT`, `SOLDE ÉCRIT`, `INCONNU` |

### Trois idées clés

1. **Le lexique est « la seule source de vérité ».** On demande explicitement au modèle de ne pas se fier
   à ses connaissances. C'est ce qui l'empêche d'inventer un sens à un mot malagasy.
2. **Un format étiqueté se vérifie par programme.** Le script compte les lignes `INCONNU` avec une simple expression régulière.
   Avec une phrase libre, c'est impossible. C'est le pont vers le JSON de la semaine 3.
3. **On versionne le prompt.** v0 n'est pas modifiée : v1 est une nouvelle version. On pourra ainsi comparer
   les deux sur les mêmes lignes (étape 5).

## Résultats (`npm run lire`, 7 lignes, température 0)

| Ligne                                     | Réponse                                                         | Verdict                                     |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| `Fasika 2vgs ⑦ … 120000 - 50000Ar`        | VOYAGE n°⑦ : 2 voyages de sable, 120000 Ar, retenue 50000, payé | ✅ (le numéro reste « ⑦ » au lieu de « 7 ») |
| `Biriky 1vgs (Service) ⑧ …`               | VOYAGE n°⑧ : …, **non écrit Ar**, gratuit                       | 🟡 voir « règles contradictoires »          |
| `Gravillon … Miandry vola 90000`          | VOYAGE n°⑨ : …, 90000 Ar, en attente de paiement                | ✅                                          |
| `Sakafo 12000 / G.O 50000 / Dokera 15000` | 3 DÉPENSE : repas, gasoil, chargeurs                            | ✅                                          |
| `Reste vola 113000`                       | SOLDE ÉCRIT : 113000 Ar                                         | ✅                                          |
| `Vola tany an-trano 100000`               | MOUVEMENT : apport 100000 Ar                                    | ✅                                          |
| `Motard 5000 / Croix 2000 / Kapoaka 3000` | 2 DÉPENSE + **INCONNU : Kapoaka**                               | ✅ le mot hors lexique est signalé          |

Avec v0 (étape 1), « (Service) » et « Miandry vola » n'étaient pas signalés : le modèle devinait.
Avec v1, **Kapoaka**, un vrai mot malagasy absent du lexique, est signalé au lieu d'être deviné.

### Leçon 1 : des règles contradictoires

Pour un voyage « Service », le lexique dit « montant 0 », mais la règle 4 dit « si le montant n'est pas écrit → non écrit ».
Le modèle a dû choisir, et il a écrit « non écrit Ar ». **Quand deux consignes se contredisent, le modèle en choisit une, au hasard
de sa lecture.** Il faut relire son prompt comme un contrat : aucune clause ne doit en contredire une autre.

### Leçon 2 : le prompt système est renvoyé à CHAQUE appel

|                   |                                                Tokens |
| ----------------- | ----------------------------------------------------: |
| Entrée (7 appels) | 5 936 (≈ 850 par ligne, dont ≈ 820 de prompt système) |
| Sortie (7 appels) |                                                   235 |

Le modèle n'a pas de mémoire : le lexique est renvoyé avec chaque ligne. Ici, **c'est l'entrée qui coûte le plus** :
avec les prix d'Opus 5.5, 5 936 × 4 = 23 744 contre 235 × 20 = 4 700 millionièmes de dollar.

Deux solutions, qu'on verra plus tard :

- envoyer **toute la page** en un seul appel au lieu de ligne par ligne (semaine 4, avec la photo) ;
- le **cache de prompt** : le fournisseur garde le début du prompt en mémoire et le facture beaucoup moins cher (semaine 10).

## Exercice : la version v1_1

On ne modifie pas la v1 : la v1_1 est une **copie corrigée**, ajoutée à `PROMPTS` et devenue `DERNIERE_VERSION`.

| Changement                                                                                          | Pourquoi                                                                                            |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| « Service » = **payé directement à la maison** (statut « payé directement »)                        | c'est la réalité du terrain ; supprime la contradiction avec la règle 4                             |
| Numéro du voyage **en chiffres ordinaires** (⑦ → 7), numérotation qui **repart à 1 chaque semaine** | on garde l'exemple « ⑦ » pour que le modèle reconnaisse le chiffre entouré, et on dit quoi en faire |

Résultats (`npm run lire -- --version v1_1`) : les numéros sortent en **7, 8, 9** ; le voyage Service est
« payé directement » ; Kapoaka reste `INCONNU`. Coût : 6 237 tokens d'entrée (+ 300 pour le prompt plus long), 232 en sortie.

**Leçon :** pour corriger un modèle, il vaut mieux **ajouter une consigne** (« écris ⑦ → 7 ») que **retirer un exemple**.
Une première tentative remplaçait « ①, ⑦, ⑪ » par « 1, 7, 11 » : le modèle ne savait plus à quoi ressemble un chiffre
entouré, et il recopiait encore « ⑦ » une fois sur deux.
