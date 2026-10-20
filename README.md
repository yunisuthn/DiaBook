# DiaBook

**Numériser les cahiers de bord manuscrits des camions de transport de matériaux** (Antananarivo, Madagascar).

Chaque jour, les chauffeurs et les receveurs notent dans un cahier papier les voyages, les dépenses et la caisse.
Avec DiaBook, on photographie les pages du cahier, et une IA les lit. Le serveur vérifie ensuite les calculs,
l'utilisateur valide, et les données sont enregistrées.

```
📷 photo de la page ─▶ 🤖 lecture par l'IA ─▶ 🧮 vérification des calculs ─▶ 👤 validation humaine ─▶ 💾 base de données
```

> **L'IA propose, l'humain décide.** Aucune donnée extraite n'est enregistrée comme « validée » sans une action de l'utilisateur.
> La photo source et le JSON brut de l'extraction sont toujours conservés, liés aux lignes créées.

## Fonctionnalités

- **Import** de photos par lots, redimensionnées avant envoi (`sharp`)
- **Extraction** des journées par l'API Claude (vision) : voyages, dépenses, mouvements d'argent, solde écrit
- **Contrôles automatiques** :
  - recalcul du solde, comparé au « Reste » écrit dans le cahier ;
  - continuité de la numérotation des voyages (elle repart à 1 chaque semaine) ;
  - lieux inconnus ;
  - lectures peu sûres.
- **Validation** : la photo et les champs modifiables côte à côte, les écarts mis en évidence
- **Créances** : les voyages « en attente » (_Miandry vola_), soldés par un ou plusieurs paiements
- **Référentiels** : camions, chauffeurs et receveurs, dictionnaire des lieux

## Le vocabulaire du cahier

| Dans le cahier                           | Signification                                               |
| ---------------------------------------- | ----------------------------------------------------------- |
| Fasika, Biriky, Moellon, Gravillon, Hazo | sable, brique, moellon, gravillon, bois                     |
| « 1 Vgs »                                | 1 voyage                                                    |
| Frais / Vola                             | montant du voyage                                           |
| « 120000 - 50000 »                       | montant moins une retenue                                   |
| Service tsy vola                         | voyage payé directement à la maison (hors caisse du camion) |
| Miandry vola                             | voyage non encore payé (créance)                            |
| sakafo, G.O, dokera                      | repas, gasoil, chargeurs                                    |
| Reste / Reste vola                       | solde de la journée                                         |

**Règle de calcul d'une journée :**
`solde = Σ (montant − retenue) des voyages payés + apports − Σ dépenses`.
Les voyages « service » (payés à la maison) et « en attente » ne comptent pas dans la caisse du camion.

## Stack

| Partie                | Technologies                                                      |
| --------------------- | ----------------------------------------------------------------- |
| Monorepo              | pnpm workspaces, TypeScript                                       |
| `apps/api`            | Express, Prisma, PostgreSQL, Zod, sharp, Cloudinary, JWT          |
| `apps/web`            | React, Vite, TanStack Query, React Router, Tailwind (PWA)         |
| `packages/extraction` | prompt, schéma JSON et appel à l'API Claude (`@anthropic-ai/sdk`) |
| Tests                 | Vitest                                                            |

## Structure

```
DiaBook/
├── apps/
│   ├── api/                 ← API Express + Prisma (port 3001)
│   └── web/                 ← interface React (port 5173)
├── packages/
│   └── extraction/          ← lecture d'une photo de cahier par l'IA
├── cahier-extract/          ← prototype d'origine (JavaScript), référence du schéma et du prompt
├── docs/design/             ← maquettes de l'interface
├── apprentissage/           ← plan d'apprentissage IA en 12 semaines (fil rouge : DiaBook)
└── docker-compose.yml       ← PostgreSQL de développement (port 5434)
```

## Installation

Prérequis : **Node.js 22+**, **pnpm**, **Docker**.

```bash
git clone https://github.com/yunisuthn/DiaBook.git
cd DiaBook
pnpm install
cp .env.example .env         # puis remplis les valeurs (voir ci-dessous)
pnpm db:up                   # démarre PostgreSQL (Docker)
pnpm db:migrate              # crée les tables
pnpm db:seed                 # compte admin, lieux, camion et personnes d'exemple
pnpm dev                     # API + interface → http://localhost:5173
```

### Variables d'environnement (`.env`)

| Variable                                            | Rôle                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | identifiants de la base Docker. **Choisis-les avant le premier `pnpm db:up`.**                                        |
| `DATABASE_URL`                                      | connexion à la base ; reprend les trois valeurs ci-dessus                                                             |
| `JWT_SECRET`                                        | secret de signature des sessions, au moins 32 caractères (`openssl rand -base64 48`)                                  |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                     | compte administrateur créé par `pnpm db:seed`                                                                         |
| `ANTHROPIC_API_KEY`                                 | clé de l'API Claude (payante). Sans elle, les photos sont reçues mais pas lues.                                       |
| `CLAUDE_MODEL`                                      | modèle utilisé pour la lecture (par défaut : `claude-opus-5-5`)                                                       |
| `CLOUDINARY_URL`                                    | stockage des photos. Vide en développement : les photos vont dans `apps/api/uploads/`. **Obligatoire en production.** |

Le fichier `.env` n'est **jamais commité**. Seul `.env.example` est dans le dépôt.

## Commandes

| Commande                           | Effet                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                         | lance l'extraction (compilation en continu), l'API et l'interface |
| `pnpm test`                        | lance tous les tests (règles de calcul, extraction, routes)       |
| `pnpm lint` / `pnpm typecheck`     | qualité du code                                                   |
| `pnpm build`                       | compile tous les paquets                                          |
| `pnpm db:up` / `pnpm db:down`      | démarre / arrête PostgreSQL                                       |
| `pnpm db:migrate` / `pnpm db:seed` | migrations / données initiales                                    |

## Données

Les photos des cahiers et les extractions réelles **ne sont pas dans ce dépôt** : elles appartiennent aux propriétaires
et aux chauffeurs des camions. Le `.gitignore` exclut `cahier-extract/photos/`, `cahier-extract/out/` et les rapports générés.
Le test qui vérifie le schéma sur ces extractions est ignoré quand elles sont absentes.

## Apprentissage

Le dossier [`apprentissage/`](apprentissage/) suit un plan de 12 semaines pour apprendre à construire ce type d'application
avec un LLM : tokens, prompts, sorties JSON, vision, évaluation, outils, embeddings…
Les exercices utilisent l'offre gratuite de Gemini.
Voir [le plan](apprentissage/PLAN-12-SEMAINES.md) et [la semaine 1](apprentissage/semaine-01/).
