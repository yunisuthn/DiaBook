# Semaine 1 — Résumé des étapes

Fiche de révision : ce qu'on a fait, ce qu'il faut retenir, et ce qu'il reste à faire.
LLM utilisé : **Gemini** (offre gratuite Google AI Studio), modèle `gemini-flash-lite-latest`.

---

## ✅ Étape 1 — Comprendre ce qu'est un LLM

Fichier : [01-comprendre-un-llm.md](01-comprendre-un-llm.md)

| Notion      | À retenir                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| LLM         | Prédit le token suivant, puis le suivant… Il ne vérifie rien : il produit le texte le plus _plausible_.                 |
| Token       | Fragment de texte. Tout se compte en tokens : limites, coût, vitesse. Le malagasy coûte plus de tokens que le français. |
| Contexte    | Tout ce que le modèle voit pendant UN appel. Aucune mémoire entre deux appels : il faut tout renvoyer.                  |
| Température | 0 = stable, fidèle (extraction, lecture du cahier). Plus haut = varié, créatif (rédaction, idées).                      |
| Coût        | Entrée bon marché, **sortie 5× plus chère**. La réflexion (thinking) compte comme de la sortie.                         |

---

## ✅ Étape 2 — Appeler un LLM depuis Node.js

Fichiers : [lib/gemini.js](lib/gemini.js), [scripts/models.js](scripts/models.js), [scripts/hello.js](scripts/hello.js), [.env.example](.env.example)

- La clé API est dans le fichier `.env`. Ce fichier n'est **jamais commité** ; le `.env.example`, lui, l'est.
- Un seul fichier parle au fournisseur (`lib/gemini.js`) : pour passer à Claude ou à Ollama, on ne change que lui.
- Les erreurs sont traduites en français :

| Code      | Signification                                |
| --------- | -------------------------------------------- |
| 400       | Clé invalide (chez Google, ce n'est pas 401) |
| 404       | Modèle introuvable                           |
| 429       | Trop de requêtes                             |
| 503 / 504 | Google surchargé ou trop lent                |
| —         | Timeout, ou pas de connexion Internet        |

- Le SDK **réessaie tout seul** en cas de 429, 500, 503 ou 504 (`retryOptions`).

**Ce que tu as observé :**

- `gemini-flash-latest` était saturé (erreurs 503/504) ; `gemini-flash-lite-latest` répond bien.
- Le modèle a **inventé** le sens de « Nitondra fasika ». Une fois le vocabulaire donné dans la question,
  il a répondu juste : c'est la preuve qu'il faut **donner le contexte** au lieu de compter sur ce que le modèle « sait ».

---

## ✅ Étape 3 — Livrable A : `scripts/ask.js`

Fichier : [scripts/ask.js](scripts/ask.js)

```bash
node scripts/ask.js "question"              # réponse d'un bloc
node scripts/ask.js "question" --stream     # au fur et à mesure (Ctrl+C = stop)
node scripts/ask.js "question" --temp 0.2   # température de 0 à 2 chez Gemini
```

- `parseArgs` (intégré à Node) lit la ligne de commande, sans bibliothèque.
- Streaming : `generateContentStream`, puis `for await`, puis `process.stdout.write`.
- Le nombre de tokens arrive avec les derniers morceaux.
- `AbortController` permet d'annuler la requête : c'est le même mécanisme que le bouton « Stop ».

**Ce que tu as observé :**

- À température 0, les réponses ne sont pas strictement identiques, mais elles sont stables.
  **Pour lire un cahier : 0.**
- La même phrase coûte 15 tokens en français et 18 en malagasy, alors que la version malagasy est plus courte
  (1,7 contre 2,6 tokens par mot).
- Sans consigne, le modèle devine ce qu'on veut. Il ne connaît pas « vgs » (= voyages).

---

## ✅ Étape 4 — Livrable B : streaming Express → React

Fichiers : [server/src/index.js](server/src/index.js), [client/src/App.jsx](client/src/App.jsx), [client/src/lireFluxSSE.js](client/src/lireFluxSSE.js), [client/vite.config.js](client/vite.config.js)

```
Gemini ─▶ Express (res.write, format SSE) ─▶ proxy Vite ─▶ fetch + lecteur ─▶ setState ─▶ écran
React « Stop » ─▶ abort() ─▶ Express voit res.on('close') ─▶ annule la requête Gemini
```

- **SSE plutôt que du texte brut** : chaque message a une étiquette (`texte`, `fin`, `erreur`).
- **`fetch` plutôt qu'`EventSource`** : `EventSource` ne sait faire que du GET, et nous envoyons un POST.
- **On démarre Gemini avant d'envoyer le `200`** : une erreur (clé, quota) garde un vrai code HTTP.
  Une erreur en plein flux est envoyée sous forme d'événement `erreur`.
- **`setReponse(prev => prev + texte)`** : on part toujours de la dernière valeur, pour ne perdre aucun morceau.
- **Stop côté serveur** : il arrête la consommation de tokens et de quota, pas seulement l'affichage.
- **Port déjà utilisé** : un terminal = un serveur. Express 5 signale l'erreur dans le callback de `listen`.

**Ce que tu as observé :** sur l'offre gratuite, il faut attendre 4 à 16 s avant le premier morceau.
C'est la file d'attente chez Google ; le texte arrive ensuite très vite.

---

## ✅ Étape 5 — Livrable C : un repo prêt à l'emploi

Fichiers : [README.md](README.md), [package.json](package.json), [.gitignore](.gitignore)

| Commande      | Ce qu'elle fait                                 | Adresse                 |
| ------------- | ----------------------------------------------- | ----------------------- |
| `npm run dev` | lance Express et Vite ensemble (`concurrently`) | <http://localhost:5180> |
| `npm start`   | compile la page React, puis Express sert tout   | <http://localhost:3100> |

- **npm workspaces** : un seul `npm install` à la racine installe `server/` et `client/`.
- **Deux modes.**
  - En développement, il y a **deux serveurs** : Vite pour la page (rechargement instantané), Express pour l'API.
    Le proxy fait le lien entre les deux.
  - En production, il n'y a **qu'un serveur** : Express sert la page compilée (`client/dist`) et l'API.
- Toute adresse inconnue renvoie `index.html` : c'est React qui décide de l'affichage.
  Une route `/api` inconnue renvoie une **404 en JSON**.

---

# Récapitulatif : ce que j'ai appris en semaine 1

1. **Un LLM prédit le texte le plus plausible, pas le plus vrai.**
   Sans contexte, il invente (« Nitondra fasika », « vgs »). Avec le lexique dans le prompt, il répond juste.
   D'où les trois garde-fous de DiaBook : contexte dans le prompt, calculs vérifiés par le serveur, validation humaine.
2. **Tout se compte en tokens.**
   Le malagasy coûte environ 50 % de tokens de plus par mot que le français. La sortie coûte 5 fois plus cher que l'entrée.
   La réflexion compte comme de la sortie.
3. **La température règle le hasard.** 0 pour lire et extraire, plus haut pour rédiger ou inventer.
   Même à 0, deux réponses peuvent différer légèrement.
4. **Appeler une API proprement :**
   - la clé dans le `.env` ;
   - un seul fichier qui parle au fournisseur ;
   - des erreurs traduites en messages compréhensibles ;
   - des réessais automatiques sur 429, 503 et 504 ;
   - un timeout.
5. **Le streaming traverse toutes les couches :**
   SDK (`for await`) → Express (`res.write` au format SSE) → navigateur (`fetch` + lecteur) → React (`setState`).
   Le bouton **Stop** remonte la chaîne et arrête aussi la consommation chez Google.
6. **Le code HTTP part une seule fois, au début.** On démarre Gemini avant d'envoyer le `200` ;
   une erreur en plein flux passe par un événement `erreur`.
7. **Un projet utilisable par d'autres :** README, `.env.example`, `.gitignore`, `npm run dev`, `npm start`.

---

# ✅ Checklist de validation de la semaine 1

Coche chaque ligne quand tu l'as vérifiée **toi-même**.

**Comprendre**

- [x] Je sais expliquer ce qu'est un token, et pourquoi le malagasy en consomme plus.
- [x] Je sais ce que contient la fenêtre de contexte, et que le modèle n'a pas de mémoire entre deux appels.
- [x] Je sais quelle température choisir pour extraire des données (0), et pourquoi.
- [x] Je sais calculer le coût d'un appel à partir des tokens d'entrée et de sortie.
- [x] Je sais ce qu'est une hallucination, et comment le contexte la réduit.

**Livrable A — ligne de commande**

- [x] `node scripts/ask.js "question"` affiche la réponse et les tokens d'entrée et de sortie.
- [x] `--temp 0` et `--temp 1.8` donnent des réponses de styles différents.
- [x] `--stream` affiche la réponse au fur et à mesure, et Ctrl+C l'interrompt proprement.
- [x] Une clé invalide, un mauvais modèle ou un timeout affichent un message clair (et pas une pile d'erreur).

**Livrable B — streaming dans React**

- [x] `POST /api/ai` répond en streaming (test avec `curl -N`).
- [x] La page affiche la réponse au fur et à mesure.
- [x] Le bouton **Stop** arrête l'affichage, ET le terminal du serveur affiche « génération arrêtée par le client ».
- [x] Un prompt vide est refusé (400) avec un message lisible.
- [x] Je sais expliquer le trajet d'un morceau de texte : Gemini → Express → navigateur → React.

**Livrable C — repo**

- [x] `npm run dev` lance les deux serveurs, et la page fonctionne sur <http://localhost:5180>.
- [x] `npm start` compile la page, et tout fonctionne sur <http://localhost:3100>.
- [x] Le `.env` n'apparaît pas dans git (`git status` ne le montre pas), le `.env.example` oui.
- [x] Quelqu'un d'autre pourrait installer et lancer le projet en suivant uniquement le README.

**Critère de réussite de la semaine :** `POST /api/ai` répond, et la page React affiche la réponse en streaming. ✅

---

# Aide-mémoire de la checklist

Pour chaque ligne : la réponse à retenir, ou la commande pour vérifier et ce que tu dois voir.
Les commandes se lancent depuis `apprentissage/semaine-01`.

## Comprendre

| Ligne             | À retenir                                                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Token**         | Un fragment de texte : un mot, un bout de mot ou un signe. Le malagasy est rare dans les données d'entraînement, donc ses mots sont coupés en plus de morceaux. Ton test : 15 tokens en français contre 18 en malagasy, pour une phrase plus courte. |
| **Contexte**      | Tout ce que le modèle voit pendant UN appel : instructions, question, historique, images, réflexion, réponse. **Aucune mémoire** entre deux appels : pour « continuer la numérotation d'hier », il faut renvoyer l'information.                      |
| **Température**   | **0 pour extraire** : on veut toujours la lecture la plus probable (`120000` reste `120000`). Une température haute sert à inventer, jamais à lire un cahier.                                                                                        |
| **Coût**          | `tokens × prix ÷ 1 000 000`, à calculer séparément pour l'entrée et pour la sortie. Exemple Opus 5.5 : 4 000 × 4 $ = 0,016 $ en entrée, 1 000 × 20 $ = 0,020 $ en sortie. La sortie coûte 5 fois plus cher, réflexion comprise.                      |
| **Hallucination** | Le modèle invente avec assurance (« Nitondra fasika » = « camion à vide », « vgs » = « sacs »). On la réduit en **donnant le vocabulaire dans le prompt**. On la rattrape ensuite par la vérification du serveur et la validation humaine.           |

## Livrable A — ligne de commande

| Ligne              | Commande                                                                                                        | Ce que tu dois voir                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Réponse + tokens   | `node scripts/ask.js "Bonjour"`                                                                                 | la réponse, puis le bloc « Consommation » (entrée, sortie, réflexion)                                                           |
| Température        | `node scripts/ask.js "Invente un nom de camion" --temp 0`, puis la même chose avec `--temp 1.8` (3 fois chacun) | à 0, des réponses proches ; à 1.8, des réponses plus variées ou étranges                                                        |
| Streaming + Ctrl+C | `node scripts/ask.js "Écris 300 mots sur Antananarivo" --stream`, puis Ctrl+C pendant l'écriture                | le texte apparaît par morceaux, puis « ⏹ Interrompu (Ctrl+C) »                                                                  |
| Erreurs claires    | dans `.env` : enlève une lettre de la clé, puis mets un modèle inexistant, puis `GEMINI_TIMEOUT_MS=100`         | « Clé API invalide », « Modèle introuvable (404) », « Pas de réponse au bout de 0.1 s ». **Remets ensuite les bonnes valeurs.** |

## Livrable B — streaming dans React

| Ligne                | Comment vérifier                                                                                                                                                    | Ce que tu dois voir                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `curl -N`            | `npm run dev` dans un terminal, puis dans un autre : `curl -N -X POST localhost:3100/api/ai -H 'Content-Type: application/json' -d '{"prompt":"Compte de 1 à 10"}'` | des blocs `event: texte` / `data: …`, puis `event: fin` avec les tokens                            |
| Affichage progressif | <http://localhost:5180>, demander un texte long                                                                                                                     | le texte « pousse » avec un curseur qui clignote                                                   |
| Stop                 | cliquer sur **Stop** pendant la réponse                                                                                                                             | « ⏹ Génération arrêtée » sur la page, et `[api] génération arrêtée par le client` dans le terminal |
| Prompt vide          | `curl -X POST localhost:3100/api/ai -H 'Content-Type: application/json' -d '{}'`                                                                                    | `{"erreur":"Le champ « prompt » est obligatoire."}` (code 400)                                     |
| Trajet d'un morceau  | à savoir expliquer                                                                                                                                                  | voir la réponse ci-dessous                                                                         |

Le trajet d'un morceau :

1. **Gemini** génère un morceau ; le SDK le donne à Express (`for await`).
2. **Express** l'écrit au format SSE (`event: texte` / `data: …`) avec `res.write()`.
3. Le **proxy Vite** fait suivre au navigateur ; `fetch` lit le flux, et `lireFluxSSE` le découpe en événements.
4. **React** ajoute le texte (`setReponse(prev => prev + texte)`), et l'écran se redessine.
5. **Stop** fait le chemin inverse : `abort()` coupe la connexion ; Express le voit (`res.on('close')`) et annule Gemini.

## Livrable C — repo

| Ligne              | Comment vérifier                                                                            | Ce que tu dois voir                                                            |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`      | `npm run dev`, puis <http://localhost:5180>                                                 | des lignes `[api]` et `[page]` dans un seul terminal ; la page fonctionne      |
| `npm start`        | `npm start`, puis <http://localhost:3100>                                                   | « Page React compilée servie sur http://localhost:3100 » ; la page fonctionne  |
| `.env` hors de git | après un `git init` : `git status`                                                          | `.env.example` est listé, `.env` **n'apparaît pas** (il est dans `.gitignore`) |
| README suffisant   | copier `semaine-01` ailleurs, sans `node_modules` ni `.env`, et suivre uniquement le README | le projet s'installe et se lance sans aide                                     |

➡️ Semaine suivante : **prompt engineering** — voir [PLAN-12-SEMAINES.md](../PLAN-12-SEMAINES.md).
