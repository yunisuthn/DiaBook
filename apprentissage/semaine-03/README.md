# Semaine 3 — Sorties structurées (JSON)

Objectif : que le modèle réponde avec des **données** (JSON) que le programme peut utiliser directement,
**validées** par un schéma, au lieu d'un texte à relire.
LLM : Gemini (offre gratuite), comme les semaines précédentes. Toutes les lignes de cahier sont **inventées**.

## Installation

```bash
cd apprentissage/semaine-03
npm install
cp ../semaine-02/.env .env      # même clé que les semaines précédentes
npm run json-demande            # étape 1 : JSON demandé dans le prompt, sur les 7 lignes
npm run json-demande -- 1       # une seule ligne
npm run json-impose             # étape 2 : JSON imposé par l'API (schéma)
npm run json-impose -- --fois 3 # les 7 lignes, 3 fois de suite
npm run json-impose -- "* Tany 1vgs ⑩ Ivato -> Anosy Vola 50000"  # une ligne de ton choix
```

## Organisation

```
semaine-03/
├── 01-json-demande.md        ← étape 1 : pourquoi du JSON, et ce qui casse quand on le demande
├── 02-json-impose.md         ← étape 2 : responseMimeType + schéma, ce qui est garanti (et ce qui ne l'est pas)
├── lib/gemini.js             ← client Gemini (copie des semaines précédentes)
├── donnees/lignes.js         ← les 7 lignes de test inventées (semaine 2)
├── prompts/lexique.js        ← blocs réutilisables : rôle, lexique, règles
├── prompts/journee.js        ← les prompts de la semaine, assemblés à partir des blocs
├── schemas/ligne.js          ← étape 2 : le schéma JSON d'une ligne, écrit à la main
├── scripts/json-demande.js   ← étape 1 : demande du JSON et essaie JSON.parse
└── scripts/json-impose.js    ← étape 2 : JSON imposé par l'API
```

## Progression

- [x] Étape 1 — Demander du JSON dans le prompt : ce qui casse
- [x] Étape 2 — JSON imposé par l'API (`responseMimeType` + schéma)
- [ ] Étape 3 — Valider le contenu avec Zod : un seul schéma pour l'API et pour le code
- [ ] Étape 4 — Une journée entière : `extraireJournee(texte)`
- [ ] Étape 5 — Quand le JSON est invalide : relancer avec l'erreur ; bilan sur 10 journées + checklist

**Critère de réussite :** 10 journées tapées → 10 JSON valides, du premier coup ou après une seule relance.
