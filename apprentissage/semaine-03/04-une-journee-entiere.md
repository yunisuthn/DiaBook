# Étape 4 — Une journée entière : `extraireJournee(texte)`

Fichiers : [lib/extraction.js](lib/extraction.js), [schemas/journee-zod.js](schemas/journee-zod.js),
[donnees/journees.js](donnees/journees.js), [scripts/journee.js](scripts/journee.js).

## L'idée : une page = un appel

Jusqu'ici, on lisait **une ligne par appel**. Mais une page du cahier est un tout : une date en haut, des voyages,
des dépenses, un « Reste » en bas. On envoie maintenant **toute la page** et on reçoit **un seul objet journée** :

```json
{
  "date_ecrite": "28-09-26",
  "date": "2026-09-28",
  "elements": [
    {
      "type": "voyage",
      "numero": 1,
      "quantite": 1,
      "produit": "sable",
      "origine": "Ampasika",
      "destination": "Ivato",
      "montant": 80000,
      "retenue": null,
      "statut": "paye"
    },
    { "type": "depense", "nature": "repas", "montant": 12000 },
    { "type": "solde", "montant": 213000 }
  ]
}
```

## Le schéma d'une journée

[schemas/journee-zod.js](schemas/journee-zod.js) **réutilise** `ElementSchema` de l'étape 3 :
toutes les règles sur les voyages (payé ⇒ montant, retenue ≤ montant, en attente ⇒ montant) s'appliquent aussi ici.
(À l'étape 5, « en attente ⇒ montant » est devenu un avertissement.)
On ajoute seulement :

- `date_ecrite` : la date telle qu'elle est écrite (« 28-09-26 », « 30/09/26 », « Asabotsy 03-10-26 ») ;
- `date` : la même date au format **AAAA-MM-JJ** (`z.iso.date()`), ou `null` si la page n'en a pas ;
- une règle sur la journée : **un seul « Reste » écrit** par page.

`regrouper(journee)` range ensuite les éléments par type (voyages, dépenses, mouvements, reste, inconnus) :
c'est la forme pratique pour afficher, et plus tard pour calculer le solde.

## La fonction centrale : `extraireJournee(ai, texte)`

[lib/extraction.js](lib/extraction.js) rassemble tout ce qu'on a appris cette semaine :

1. appel avec le prompt `PROMPT_JOURNEE` et le **schéma imposé** à l'API ;
2. `JSON.parse` ;
3. `JourneeSchema.safeParse` ;
4. résultat : `{ journee, brut, usage }`, ou une **`ErreurExtraction`** qui garde la réponse brute
   (DiaBook conserve toujours le JSON brut de l'extraction).

## Les données de test

[donnees/journees.js](donnees/journees.js) : **10 journées inventées** qui se suivent (du 28/09 au 08/10).
Chacune a un `attendu` (date, nombre de voyages, de dépenses, Reste) et cache un piège :

| Journée | Piège                                                                      |
| ------- | -------------------------------------------------------------------------- |
| J02     | retenue (`120000 - 50000`) et un voyage en attente                         |
| J03     | date écrite avec des `/`, apport (`Vola tany an-trano`)                    |
| J04     | `service tsy vola`, mot hors lexique (`Kapoaka`)                           |
| J05     | **pas de date** sur la page : elle doit rester `null`                      |
| J06     | `Asabotsy` (samedi) devant la date                                         |
| J07     | nouvelle semaine : la numérotation **repart à 1** ; `Total vola`           |
| J08     | `Déménagement`, autre mouvement (`Vola Ambohipanja`)                       |
| J09     | une dépense écrite **entre deux voyages**                                  |
| J10     | **erreur volontaire du receveur** dans le Reste (138000 au lieu de 128000) |

## Résultats (`npm run journee -- --toutes`)

**10/10 journées valides**, et toutes conformes à l'`attendu` :

- J05 : `date (non écrite)` → le modèle n'a **pas** deviné la date ;
- J04 : `Kapoaka` signalé inconnu ;
- J10 : `reste 138000` → le modèle a **recopié** le Reste écrit sans le « corriger ». C'est le bon comportement :
  **on lit, on ne corrige pas**. Le serveur détectera l'écart en semaine 5.

### Le coût : une page par appel, c'est beaucoup moins cher en entrée

|                                           | Ligne par ligne (semaine 2, prompt v2) | Page entière (étape 4) |
| ----------------------------------------- | -------------------------------------: | ---------------------: |
| Tokens d'entrée pour une page de 6 lignes |                    ≈ 6 × 1 100 = 6 600 |            **≈ 1 060** |
| Tokens de sortie pour une page            |                 ≈ 200 (texte étiqueté) |           ≈ 400 (JSON) |

- **Entrée ÷ 6** : le prompt (lexique, règles, schéma) n'est envoyé qu'**une fois par page**, et plus une fois par ligne.
- **Sortie × 2** : le JSON répète le nom des champs (`"type"`, `"montant"`…) pour chaque élément.
  La sortie coûte 5 fois plus cher que l'entrée : c'est le prix de données **directement utilisables** par le programme.

Sur les 10 journées : 10 605 tokens d'entrée et 3 993 de sortie.

## Exercice : ta propre page (J11)

Une 11ᵉ journée, écrite à la main, le 09-10-26 :

```
09-10-26
* Fasika 1vgs ⑪ Ampasika -> Ivato Frais 90000 - 20000
* Moellon 1vgs ⑫ Ambohidratrimo -> Anosy Frais 85000
Sakafo 12000 / G.O 45000 / Police 5000
Reste vola 93000
```

| Étape                         | Calcul               |   Résultat |
| ----------------------------- | -------------------- | ---------: |
| Voyage ⑪ (payé, avec retenue) | 90000 − 20000        |     70 000 |
| Voyage ⑫ (payé)               | 85000                |     85 000 |
| Dépenses                      | 12000 + 45000 + 5000 |     62 000 |
| **Reste**                     | 155000 − 62000       | **93 000** |

Résultat de la lecture : date 2026-10-09, 2 voyages (dont la retenue de 20000), 3 dépenses, Reste 93000 : conforme à l'`attendu`.

**Ce que l'exercice a montré :**

- Un premier calcul à la main avait donné 50000 : **une erreur de calcul est vite arrivée**.
  C'est exactement ce que le serveur de DiaBook doit détecter chez les receveurs (semaine 5).
- Le script affichait ✅ même quand l'`attendu` ne correspondait pas : ✅ veut seulement dire « JSON valide selon Zod ».
  **Comparer automatiquement à l'attendu** sera la première partie de l'étape 5.
