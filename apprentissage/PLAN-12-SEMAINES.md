# Plan d'apprentissage IA — 12 semaines, projet fil rouge DiaBook

**Objectif final :** comprendre et savoir construire soi-même la chaîne de DiaBook :
photo du cahier → lecture par l'IA → vérification des calculs → validation humaine → enregistrement.

## Principes

- **Gratuit.** On utilise l'offre gratuite de Gemini (Google AI Studio) ; Ollama, un modèle local, sert de comparaison.
- **Un seul fichier parle au fournisseur** (`lib/gemini.js`) : on pourra passer à Claude plus tard sans tout réécrire.
- **Jamais de vraies photos de clients** sur l'offre gratuite : Google peut utiliser ces données.
  On travaille avec des pages recopiées à la main ou anonymisées.
- **Déroulé de chaque semaine :** explication → code commenté → commande de test → exercice seul → checklist.
- **JavaScript** jusqu'à la semaine 11, puis **TypeScript** pour l'intégration dans `apps/` (semaine 12).

## Vue d'ensemble

| Sem. | Thème | Livrable DiaBook |
| ---: | --- | --- |
| 1 | Comprendre un LLM, appeler une API, streaming | `ask.js` + page React en streaming ✅ (étape 5 en cours) |
| 2 | Prompt engineering | Prompt « lecteur de cahier » avec le lexique malagasy |
| 3 | Sorties structurées (JSON) | Texte d'une journée → JSON validé par Zod |
| 4 | Vision : lire une image | Photo d'une page → JSON |
| 5 | Règles métier et validation humaine | Calcul du solde + écran de validation |
| 6 | Évaluer la qualité | Jeu de test + score de précision par champ |
| 7 | Function calling (outils) | L'IA appelle nos fonctions : lieux, dernier n° de voyage |
| 8 | Embeddings et recherche sémantique | Normaliser les lieux mal orthographiés |
| 9 | Assistant sur les données | « Combien de voyages de sable en septembre ? » |
| 10 | Coût, performance, fiabilité | File d'attente des extractions, cache, logs |
| 11 | Sécurité et modèles locaux | Défense contre l'injection de prompt, comparaison avec Ollama |
| 12 | Intégration et bilan | Brancher le pipeline dans `apps/api` + démo |

---

## Semaine 1 — Comprendre un LLM et l'appeler ✅

- **Notions :** token, fenêtre de contexte, température, coût entrée/sortie, streaming, gestion d'erreurs.
- **Livrable :** `scripts/ask.js` ; route `POST /api/ai` en SSE ; page React avec bouton « Stop ».
- **Dossier :** [semaine-01/](semaine-01/) — résumé dans [semaine-01/RESUME.md](semaine-01/RESUME.md).

## Semaine 2 — Prompt engineering

- **Notions :**
  - instructions système et message utilisateur ;
  - consignes claires, rôle, format de réponse ;
  - exemples (*few-shot*) ;
  - conversation sur plusieurs tours (historique renvoyé à chaque appel).
- **Pratique :** écrire le prompt « lecteur de cahier ».
  - Il contient le lexique : Fasika, Biriky, vgs, sakafo, G.O, « Miandry vola »…
  - Il fixe les règles : ne rien inventer, signaler ce qui est illisible.
- **Livrable :** `prompts/cahier.js`, versionné, et un script qui compare plusieurs versions du prompt
  sur les mêmes textes.
- **Réussite :** sur 5 lignes de cahier tapées à la main, aucun mot malagasy n'est inventé.

## Semaine 3 — Sorties structurées (JSON)

- **Notions :**
  - schéma JSON imposé au modèle (`responseSchema`) ;
  - validation avec **Zod** ;
  - que faire quand le JSON est invalide (réessayer, signaler).
- **Pratique :** définir le schéma d'une journée.
  - Contenu : date, camion, voyages (numéro, produit, quantité, origine → destination, montant, retenue, statut),
    dépenses, mouvements, « Reste » écrit.
  - Montants en **entiers** (Ariary), jamais de nombres à virgule.
- **Livrable :** `extraireJournee(texte)` → objet validé, ou erreur explicite.
- **Réussite :** 10 journées tapées → 10 JSON valides du premier coup ou après une seule relance.

## Semaine 4 — Vision : lire une photo

- **Notions :**
  - envoyer une image au modèle ;
  - coût d'une image en tokens ;
  - redimensionner et recadrer avec **sharp** ;
  - qualité de la photo (ombre, flou, deux pages sur une même photo).
- **Pratique :** upload d'une photo (Express + multer), prétraitement avec sharp, extraction en JSON.
  - On garde la **photo source** et le **JSON brut**.
- **Livrable :** page React « Importer » : photo → JSON affiché.
- **Réussite :** sur 5 pages de test, les voyages et les montants sont lus ; ce qui est illisible est signalé.

## Semaine 5 — Règles métier et validation humaine

- **Notions :** « l'IA propose, l'humain décide » ; le serveur recalcule ; écarts et alertes.
- **Pratique :**
  - Implémenter la règle du solde :
    `Σ(montant − retenue) des voyages payés + apports − Σ dépenses`.
  - La comparer au « Reste » écrit dans le cahier.
  - Vérifier que la numérotation des voyages se suit d'un jour à l'autre.
  - Écrire les **tests** (vitest) de chaque règle.
- **Livrable :** écran de validation : la photo à gauche, les champs modifiables à droite,
  les écarts surlignés, un bouton « Valider ».
- **Réussite :** les tests passent ; un écart entre solde calculé et « Reste » est toujours visible avant validation.

## Semaine 6 — Évaluer la qualité

- **Notions :**
  - jeu de test (photos + JSON attendu) ;
  - précision par champ (montant, date, lieu, produit) ;
  - variabilité d'un appel à l'autre ;
  - comparer des modèles, des prompts et des températures.
- **Pratique :** construire 15 à 20 pages de référence et un script `eval.js` qui produit un tableau de scores.
- **Livrable :** un rapport « prompt v1 contre v2, Flash-Lite contre Flash ».
- **Réussite :** chaque changement de prompt est jugé sur des **chiffres**, pas sur une impression.

## Semaine 7 — Function calling (outils)

- **Notions :**
  - le modèle demande à appeler une fonction ;
  - notre code l'exécute ;
  - on lui renvoie le résultat ;
  - la boucle d'agent, et ses limites.
- **Pratique :** donner des outils au modèle :
  - `listerLieuxConnus()` ;
  - `dernierNumeroVoyage(camion, date)` ;
  - `calculerSolde(journee)`.
- **Livrable :** une extraction qui vérifie elle-même la continuité de la numérotation et les noms de lieux.
- **Réussite :** le modèle utilise les outils au lieu d'inventer, et la boucle s'arrête toujours (nombre maximum de tours).

## Semaine 8 — Embeddings et recherche sémantique

- **Notions :**
  - embedding : du texte transformé en vecteur ;
  - similarité entre deux vecteurs ;
  - pgvector (extension de PostgreSQL, déjà dans la stack de DiaBook) ;
  - RAG (aller chercher les bonnes informations, puis les donner au modèle).
- **Pratique :** rapprocher les lieux mal orthographiés (« Ambohipanja », « Ambhipanja », « Ambohipanj ») du bon lieu.
- **Livrable :** `normaliserLieu(texte)` → lieu connu + score de confiance.
- **Réussite :** plus de 90 % des variantes du jeu de test sont rattachées au bon lieu.

## Semaine 9 — Assistant sur les données

- **Notions :**
  - question en langage naturel → requête sur la base, en lecture seule ;
  - sécurité des requêtes ;
  - réponses citées et vérifiables.
- **Pratique :** un chat « Combien de voyages de sable en septembre ? », « Quelles créances sont en attente ? ».
- **Livrable :** une page Chat qui streame la réponse (on réutilise la semaine 1) et affiche les chiffres utilisés.
- **Réussite :** aucune écriture possible en base ; chaque chiffre de la réponse vient d'une requête visible.

## Semaine 10 — Coût, performance, fiabilité

- **Notions :**
  - quotas et erreur 429 à grande échelle ;
  - **file d'attente** des extractions (traitement en arrière-plan) ;
  - cache du prompt ;
  - logs : tokens, durée et erreurs par extraction ;
  - suivi des versions de prompt.
- **Pratique :** importer 30 photos d'un coup sans dépasser le quota ; tableau de bord des tokens consommés.
- **Livrable :** une file d'extraction avec reprise après erreur, et des statistiques de coût
  (« ce que ça coûterait chez Claude »).
- **Réussite :** un lot de photos va jusqu'au bout malgré des erreurs 429 et 503.

## Semaine 11 — Sécurité et modèles locaux

- **Notions :**
  - **injection de prompt** : un texte écrit sur la photo peut contenir des instructions ;
  - données personnelles ;
  - abus et limites d'usage ;
  - modèles locaux avec **Ollama** (avantages, limites).
- **Pratique :** tenter de « piéger » l'extraction, puis s'en protéger ;
  brancher Ollama derrière la même interface que `lib/gemini.js`.
- **Livrable :** une checklist de sécurité, et une comparaison Gemini / Ollama sur le jeu de test de la semaine 6.
- **Réussite :** l'extraction ignore les instructions cachées dans une photo ;
  on change de fournisseur en modifiant une seule variable du `.env`.

## Semaine 12 — Intégration dans DiaBook et bilan

- **Notions :** passage de JavaScript à TypeScript ; intégration dans `apps/api` et `apps/web` ;
  stockage de la photo et du JSON brut liés aux lignes créées.
- **Pratique :**
  - Comparer avec l'extraction déjà présente dans `packages/extraction` et `cahier-extract/`.
  - Brancher le pipeline complet : import → extraction → validation → enregistrement.
- **Livrable :** démo de bout en bout et rétrospective (ce qui marche, les limites, la suite).
- **Réussite :** une page de cahier photographiée devient une journée validée en base,
  sans aucune saisie manuelle des données.
