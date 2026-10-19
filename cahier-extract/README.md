# cahier-extract — prototype

Photo d'une page du cahier de bord → JSON structuré → fusion des pages → contrôles automatiques.

## Installation

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
# optionnel : export CLAUDE_MODEL=claude-sonnet-5-5
```

## Utilisation

```bash
# 1. Extraire chaque photo (une requête API par photo) → out/<photo>.json
node src/extract.js photos/*.png

# 2. Fusionner + valider → rapport.md et journees.json
node src/run.js out
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/schema.js` | Schéma JSON de sortie (forcé via `tool_choice`) |
| `src/prompt.js` | Prompt système : glossaire malgache/français, règles de calcul, consignes |
| `src/extract.js` | Pré-traitement (sharp) + appel API Claude vision |
| `src/merge.js` | Fusion des pages : regroupement par date, rattachement des blocs sans date via la numérotation, dédoublonnage |
| `src/validate.js` | Contrôles : solde écrit vs calculé, « Total vola », trous de numérotation, créances (« Miandry vola »), lieux inconnus, faible confiance |
| `src/lieux.js` | Dictionnaire des lieux + correspondance approximative |
| `out/` | Extractions des 7 photos de test |
| `rapport.md` | Résultat sur les 7 photos de test |

## Règle de calcul d'une journée

```
solde = Σ (montant − retenue) des voyages payés + apports (« Vola tany an-trano ») − Σ dépenses
```
Les voyages « service tsy vola » et « Miandry vola » ne comptent pas dans la caisse.

## Conseils photo pour les chauffeurs

Une page par photo, cahier à plat, sans ombre de main, date + camion en haut de chaque page, numéroter tous les voyages.
