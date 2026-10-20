# Semaine 2 — Prompt engineering

Objectif : écrire le prompt « lecteur de cahier » qui fait lire une ligne du cahier au modèle
**sans rien inventer**. LLM : Gemini (offre gratuite), comme en semaine 1.

Les lignes de test de [donnees/lignes.js](donnees/lignes.js) sont **inventées** dans le style du cahier :
aucune vraie donnée ne sort de la machine.

## Installation

```bash
cd apprentissage/semaine-02
npm install
cp ../semaine-01/.env .env     # même clé que la semaine 1
npm run comparer               # prompt nu contre prompt construit, sur la 1re ligne
npm run comparer -- 2          # sur la 2e ligne
npm run comparer -- "ma ligne" # sur une ligne de ton choix
npm run lire                   # toutes les lignes, dernière version du prompt
npm run lire -- --version v0   # toutes les lignes, avec une version précise
npm run lire -- 7              # une seule ligne
```

## Organisation

```
semaine-02/
├── 01-anatomie-d-un-prompt.md  ← étape 1 : système / utilisateur, les 5 ingrédients
├── lib/gemini.js               ← copie de la semaine 1 (client, erreurs)
├── donnees/lignes.js           ← lignes de cahier inventées (avec des pièges)
├── 02-prompt-lecteur-de-cahier.md ← étape 2 : lexique complet, règles, format étiqueté
├── prompts/cahier.js           ← les versions du prompt (v0, v1, v1_1)
├── scripts/comparer.js         ← étape 1 : prompt nu contre prompt construit
└── scripts/lire.js             ← étape 2 : lit les lignes avec une version du prompt
```

## Progression

- [x] Étape 1 — Anatomie d'un prompt : instructions système / message, les 5 ingrédients
- [x] Étape 2 — Le prompt « lecteur de cahier » v1 : lexique complet, règles anti-invention, versionné
- [ ] Étape 3 — Apprendre par l'exemple (few-shot) : v2
- [ ] Étape 4 — Conversation sur plusieurs tours : l'historique
- [ ] Étape 5 — Comparer les versions sur toutes les lignes + checklist

**Critère de réussite :** sur 5 lignes de cahier, aucun mot malagasy n'est inventé.
