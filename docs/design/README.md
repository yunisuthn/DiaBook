# Design de l'interface DiaBook

Maquettes des écrans, réalisées le 7 octobre 2026 avec le design system **Onisoa**.
Elles ne sont pas encore appliquées à `apps/web` : ce dossier les conserve pour l'intégration.

- Canvas interactif (privé) : https://claude.ai/artifact/VmGfDoXF4dEx5zY1PURREz
- Design system Onisoa : https://claude.ai/artifact/5sGE9B8bVZZD9csF8UQrtE

## Contenu

| Chemin | Rôle |
| --- | --- |
| `maquettes/*.dc.html` | Un fichier par écran (format du canvas : HTML + composants Onisoa). Les données affichées sont des exemples. |
| `maquettes/diabook.css` | Variables du thème et classes communes des maquettes (tableaux, libellés, photo de page). |
| `maquettes/ds/onisoa/` | Copie du design system : `tokens.json` (couleurs, typo, espacements), `README.md` (règles d'usage), composants React (`bundle.js`, `bundle.css`). |
| `maquettes/canvas.json` | Disposition des écrans sur le canvas. |
| `brouillons-web/` | Début d'intégration, à reprendre : thème Tailwind v4 (`theme-tailwind.css`), types du domaine, formats (Ariary, dates), helper de classes. |

## Écrans

| Maquette | Route prévue | Points clés |
| --- | --- | --- |
| `Connexion` | `/connexion` | Accroche à gauche (grille de points), formulaire à droite, erreur sous le mot de passe. |
| `Main` (tableau de bord) | `/` | Période (aujourd'hui / 7 j / 30 j), cartes recette nette, apports, créances encaissées, dépenses, solde avec sa formule ; pages à valider ; créances ; synthèse par camion. |
| `Journees` | `/journees` | Filtres (statut, camion, dates), tableau avec écarts en évidence, détail d'une journée (photo, voyages, dépenses, mouvements, contrôle du solde). |
| `Importer` | `/importer` | Trois étapes (photo → lecture IA → validation), prise de photo ou fichier, imports récents. |
| `Validation` | `/journees/:id/verifier` | Photo à côté des champs lus, tous modifiables ; lecture incertaine signalée ; solde recalculé en direct ; validation bloquée en cas d'écart tant que l'utilisateur ne confirme pas. |
| `Creances` | `/creances` | En attente (ancienneté, filtres) ; boutons **Encaisser** / **Payée hors caisse** ; créances payées avec bascule caisse / hors caisse. |
| `Parametres` | `/parametres` | Camions (dernier n° de voyage), chauffeurs, produits, lieux et variantes d'écriture, configuration de lecture, compte. |

## Règle métier ajoutée pendant le design

Une créance (« Miandry vola ») payée peut être :
- **encaissée** : son montant entre dans le solde de caisse du jour du paiement, pour son camion ;
- **payée hors caisse** : la créance est soldée, mais le montant ne compte pas dans le solde.

Solde d'une période = Σ soldes des journées validées + créances encaissées pendant la période.
Reportée dans CLAUDE.md (section « Créances ») et dans `calculerCaisse` (apps/api/src/domaine/calcul.ts, avec tests).

## Plan d'intégration prévu

1. Thème : reprendre `brouillons-web/theme-tailwind.css` dans `apps/web/src/index.css` et charger les polices
   Schibsted Grotesk et Martian Mono (Google Fonts) dans `index.html`.
2. Réécrire les composants Onisoa en TSX (Bouton, Etiquette, Statut, EnTeteSection, Champ, CarteChiffre) dans `apps/web/src/components/ui/`.
3. Calculs : faits côté API (`calculerJournee`, `calculerCaisse` dans apps/api/src/domaine/calcul.ts) ;
   l'écran de vérification les obtient de l'API, ou on les déplace dans un paquet partagé.
4. Données : hooks TanStack Query par ressource (journées, créances, imports, référentiels), branchés sur l'API
   dès que les routes existent.
5. Pages : une par maquette, plus la route de vérification d'une journée.
