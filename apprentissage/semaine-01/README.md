# DiaBook · Semaine 1 — Appeler un LLM et streamer sa réponse

Premier livrable du plan d'apprentissage IA ([PLAN-12-SEMAINES.md](../PLAN-12-SEMAINES.md)).
On pose une question à un LLM (**Gemini**, offre gratuite) en ligne de commande ou depuis une page React,
et la réponse s'affiche **au fur et à mesure**.

Ce dossier est un bac à sable **indépendant de l'application DiaBook** (`apps/`, `packages/` ne sont pas touchés).
Il est en JavaScript (ES modules), sans TypeScript, et s'installe avec `npm`.

Résumé de ce qu'on y apprend : [RESUME.md](RESUME.md).

## Prérequis

- **Node.js 22** ou plus récent (`node -v`)
- Une **clé API Gemini gratuite** : <https://aistudio.google.com/apikey> → _Create API key_.
  Ne clique pas sur « Set up billing » : la ligne doit rester en **Free tier**.

## Installation

```bash
cd apprentissage/semaine-01
npm install                 # installe tout : scripts, serveur et page
cp .env.example .env        # puis colle ta clé après GEMINI_API_KEY=
npm run hello               # vérifie que la clé fonctionne
```

Le fichier `.env` contient ta clé : il est ignoré par git et **ne doit jamais être commité**.

| Variable            | Rôle                                                | Valeur par défaut          |
| ------------------- | --------------------------------------------------- | -------------------------- |
| `GEMINI_API_KEY`    | clé AI Studio (obligatoire)                         | —                          |
| `GEMINI_MODEL`      | modèle utilisé (`npm run models` liste les modèles) | `gemini-flash-lite-latest` |
| `GEMINI_TIMEOUT_MS` | délai maximum d'attente d'une réponse               | `30000`                    |
| `PORT`              | port du serveur Express                             | `3100`                     |

## Lancement

### Développement : `npm run dev`

```bash
npm run dev
```

- Cette commande lance **les deux serveurs dans un seul terminal** : `[api]` en bleu, `[page]` en violet.
- Ouvre **<http://localhost:5180>**.
- Express (port 3100) redémarre tout seul quand tu modifies son code, grâce à `node --watch`.
  La page se met à jour sans rechargement, grâce à Vite.
- **Ctrl+C** arrête les deux serveurs.

### Production : `npm start`

```bash
npm start
```

- Cette commande compile la page React (`client/dist/`), puis **Express sert tout sur un seul port**.
- Ouvre **<http://localhost:3100>**.
- C'est ce mode qu'on utiliserait pour déployer.

### En ligne de commande

```bash
node scripts/ask.js "ma question"               # réponse d'un bloc + tokens consommés
node scripts/ask.js "ma question" --stream      # au fur et à mesure (Ctrl+C pour arrêter)
node scripts/ask.js "ma question" --temp 0.2    # température de 0 à 2
node scripts/ask.js "ma question" --model gemini-3.5-flash
npm run models                                  # modèles disponibles avec ta clé
```

## L'API

| Méthode | Route         | Corps               | Réponse                                                |
| ------- | ------------- | ------------------- | ------------------------------------------------------ |
| GET     | `/api/health` | —                   | `{ "ok": true, "modele": "…" }`                        |
| POST    | `/api/ai`     | `{ "prompt": "…" }` | flux SSE : `texte` (plusieurs), puis `fin` ou `erreur` |

Exemple :

```bash
curl -N -X POST localhost:3100/api/ai -H 'Content-Type: application/json' -d '{"prompt":"Compte de 1 à 5"}'
```

```
event: texte
data: {"texte":"1, 2, 3"}

event: fin
data: {"modele":"gemini-flash-lite-latest","entree":8,"sortie":9,"reflexion":0}
```

Erreurs avant le flux (réponse JSON `{ "erreur": "…" }`) :

| Code | Cas                                     |
| ---- | --------------------------------------- |
| 400  | prompt vide, trop long ou JSON invalide |
| 429  | quota gratuit atteint                   |
| 502  | erreur côté Google                      |
| 504  | Google n'a pas répondu à temps          |

## Structure

```
semaine-01/
├── package.json             ← scripts dev / build / start, workspaces server + client
├── .env.example             ← modèle de configuration (copier en .env)
├── lib/gemini.js            ← le SEUL fichier qui parle à Gemini : client, timeout, réessais, erreurs
├── scripts/
│   ├── models.js            ← liste des modèles
│   ├── hello.js             ← premier appel
│   └── ask.js               ← question en ligne de commande (--temp, --stream, --model)
├── server/src/index.js      ← Express : POST /api/ai en SSE, sert la page compilée en production
├── client/
│   ├── vite.config.js       ← port 5180, proxy /api → 3100
│   └── src/
│       ├── App.jsx          ← champ, boutons Envoyer / Stop, affichage progressif
│       └── lireFluxSSE.js   ← découpe le flux reçu en événements
├── 01-comprendre-un-llm.md  ← cours de l'étape 1 + quiz
└── RESUME.md                ← récapitulatif + checklist de validation
```

## Problèmes fréquents

| Symptôme                                         | Cause et solution                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `Clé API manquante` / `Clé API invalide`         | le `.env` n'existe pas, ou la clé est mal copiée (pas d'espace, pas de guillemets)           |
| `Le port 3100 est déjà utilisé`                  | un autre serveur tourne déjà : regarde tes autres terminaux                                  |
| `http proxy error … ECONNREFUSED 127.0.0.1:3100` | la page tourne mais pas Express : utilise `npm run dev`, qui lance les deux                  |
| `503` / `504` répétés                            | modèle saturé sur l'offre gratuite : essaie un autre modèle dans `GEMINI_MODEL`              |
| Rien ne s'affiche pendant plusieurs secondes     | normal sur l'offre gratuite (file d'attente chez Google) : le texte arrive ensuite très vite |

## Progression

- [x] Étape 1 — Comprendre ce qu'est un LLM (tokens, contexte, température, coût) + quiz
- [x] Étape 2 — Appeler un LLM (Gemini) depuis Node.js (`.env`, gestion des erreurs)
- [x] Étape 3 — Livrable A : `node scripts/ask.js "question"` (+ tokens, `--temp`, streaming)
- [x] Étape 4 — Livrable B : streaming Express → React avec bouton « Stop »
- [x] Étape 5 — Livrable C : README, scripts `dev` / `start`, validation finale
