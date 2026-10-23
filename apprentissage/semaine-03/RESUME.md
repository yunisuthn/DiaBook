# Semaine 3 — Résumé : sorties structurées (JSON)

Fiche de révision : ce qu'on a fait, ce qu'il faut retenir, et la checklist de validation.
LLM : **Gemini** (offre gratuite), modèle `gemini-flash-lite-latest`. Toutes les lignes de cahier sont **inventées**.

---

## ✅ Étape 1 — Demander du JSON dans le prompt

Cours : [01-json-demande.md](01-json-demande.md) · Script : `npm run json-demande`

- Un programme a besoin de **données** (JSON), pas d'un texte à découper.
- Demandé dans le prompt : **6/7** réponses lisibles. La 7ᵉ était entourée de ` ```json ` : le modèle produit du
  **texte qui ressemble** à du JSON, rien ne le garantit.
- `JSON.parse` vérifie la **syntaxe**, pas le **sens** (montant en texte, statut inventé…).
- Ton exercice : la rustine `extraireJSON()` donne 7/7, mais ne répare que les défauts **prévus**.

## ✅ Étape 2 — JSON imposé par l'API

Cours : [02-json-impose.md](02-json-impose.md) · Script : `npm run json-impose`

- `responseMimeType: 'application/json'` + `responseJsonSchema` : la forme devient une **contrainte**, plus une consigne.
- **14/14** réponses lisibles, sans rustine ; montants entiers, statuts toujours dans la liste.
- Le schéma fait **partie du prompt** : noms de champs, `enum` et `description` guident le modèle.
- Il faut une **porte de sortie** (`null`, `inconnu`) : « Tany » sort en inconnu, au lieu d'un produit au hasard.
- **Le schéma garantit la forme, pas la vérité.**

## ✅ Étape 3 — Valider le contenu avec Zod

Cours : [03-valider-avec-zod.md](03-valider-avec-zod.md) · Script : `npm run json-valide`

- **Un seul schéma** Zod : converti pour l'API (`z.toJSONSchema`), et vérifié dans le code (`safeParse`).
- `discriminatedUnion('type', …)` : **une forme par type** d'élément.
- `.refine()` : les **règles métier** qu'un JSON Schema ne sait pas dire (voyage payé ⇒ montant, retenue ≤ montant).
- Les erreurs disent **quoi** et **où** (`→ at elements[0].montant`), en français.
- Ton exercice : « en attente ⇒ montant ». Pièges : condition inversée, test qui échoue pour la mauvaise raison.
  **On teste dans les deux sens.**

## ✅ Étape 4 — Une journée entière : `extraireJournee()`

Cours : [04-une-journee-entiere.md](04-une-journee-entiere.md) · Script : `npm run journee`

- **Une page = un appel** : `extraireJournee(ai, texte)` → journée validée, ou `ErreurExtraction` qui garde le JSON brut.
- Le schéma de la journée **réutilise** celui des éléments, et ajoute la date et la règle « un seul Reste ».
- 10 journées piégées : date absente (`null`, pas devinée), Reste faux du receveur (**recopié, pas corrigé**).
- Coût : **entrée ÷ 6** (le prompt n'est envoyé qu'une fois par page), **sortie × 2** (le JSON répète les noms de champs).
- Ton exercice J11 : une erreur de calcul à la main (50000 au lieu de 93000) ; et ✅ ne voulait dire que « valide ».

## ✅ Étape 5 — Quand le JSON est invalide : relancer avec l'erreur

Cours : [05-relancer-avec-l-erreur.md](05-relancer-avec-l-erreur.md) · Scripts : `npm run relance`, `npm run journee`

- **Valide ≠ conforme** : Zod vérifie la forme et les règles ; `comparerAttendu()` vérifie ce qui est écrit.
- **Relance** avec la conversation (page, réponse refusée, erreur de Zod), **une seule fois**, puis on signale.
- Vu en vrai : pour passer la validation, le modèle a **changé un voyage en élément inconnu**. Il n'avait pourtant
  rien lu de faux : c'est le cahier qui était incomplet.
- **Refus** = erreur de lecture → relance. **Avertissement** = cahier incomplet → l'utilisateur complète.
  « En attente ⇒ montant » est devenu un avertissement ; **garde-fou** : une relance ne doit pas faire disparaître de voyage.
- Un **faux client** permet de tester la relance sans appeler l'API.
- Ton exercice : avertir pour un **inconnu avec un montant** (Kapoaka 3000), avec un **tableau de règles** `si` / `avertir`.

| Résultat (`npm run journee -- --toutes`) |                               |
| ---------------------------------------- | ----------------------------: |
| JSON valides                             |             11/11 du 1er coup |
| Conformes à l'attendu                    |                         11/11 |
| Tokens (11 journées)                     | entrée 11 660, sortie ≈ 4 250 |

---

# Récapitulatif : ce que j'ai appris en semaine 3

1. Un modèle produit du **texte** : demander du JSON ne le garantit pas. Il faut le faire **imposer par l'API**.
2. L'API garantit la **forme**, Zod vérifie le **contenu** : les deux sont nécessaires, avec **un seul schéma**.
3. Le schéma guide aussi le modèle, et doit toujours avoir une **porte de sortie** (`null`, `inconnu`).
4. Une réponse du modèle est une **donnée externe** : on la valide comme une saisie utilisateur, et on garde le **brut**.
5. **Une page = un appel** : moins cher en entrée, plus cher en sortie.
6. **Valide ≠ conforme** : seul un humain (ou un jeu de test) sait ce qui est vraiment écrit.
7. On **relance avec l'erreur**, une fois. Mais la relance pousse le modèle à satisfaire le validateur :
   un refus doit viser une **erreur de lecture**, et un cahier incomplet donne un **avertissement**.
8. **L'IA lit, elle ne corrige pas** : le Reste faux est recopié ; c'est le serveur qui calculera (semaine 5).

---

# ✅ Checklist de validation de la semaine 3

**Comprendre**

- [x] Je sais pourquoi demander du JSON dans le prompt ne suffit pas.
- [x] Je sais ce que garantit `responseJsonSchema`, et ce qu'il ne garantit pas.
- [x] Je sais pourquoi on écrit le schéma une seule fois en Zod, et à quoi servent `discriminatedUnion` et `.refine()`.
- [x] Je sais pourquoi une page entière par appel coûte moins cher en entrée, mais plus en sortie.
- [x] Je sais faire la différence entre « valide » et « conforme ».
- [x] Je sais quand relancer (erreur de lecture) et quand avertir (cahier incomplet), et pourquoi une seule relance.

**Pratique**

- [x] `npm run json-demande` puis `npm run json-impose` : je vois la différence entre JSON demandé et JSON imposé.
- [x] `npm run json-valide -- --hors-ligne` : je lis les messages de Zod et je sais d'où ils viennent.
- [x] `npm run relance -- --hors-ligne` : je vois la conversation de relance, le double refus et le garde-fou.
- [x] `npm run journee -- --toutes` : j'obtiens le bilan valides / conformes, et l'avertissement Kapoaka sur J04.

**Livrable**

- [x] `extraireJournee(ai, texte)` renvoie une journée validée (avec ses avertissements), ou une `ErreurExtraction`
      qui garde les réponses brutes.
- [x] Chaque étape a été livrée dans une PR, avec des commits à mon nom.

**Critère de réussite :** 10 journées tapées → 10 JSON valides du premier coup ou après une seule relance.
✅ (11/11 du premier coup, toutes conformes à l'attendu)

➡️ Semaine suivante : **vision, lire une photo** — voir [PLAN-12-SEMAINES.md](../PLAN-12-SEMAINES.md).
