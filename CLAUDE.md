# DiaBook

Application web qui numérise les cahiers de bord manuscrits de camions de transport de matériaux (Antananarivo, Madagascar).
Les chauffeurs et receveurs écrivent dans un cahier papier ; l'utilisateur photographie les pages, une IA les lit,
le serveur vérifie les calculs, l'utilisateur valide, et les données sont enregistrées.

## Stack
- Monorepo pnpm : apps/api (Express + TypeScript), apps/web (React + Vite + TypeScript, PWA), packages/extraction
- PostgreSQL + Prisma, Zod pour toutes les entrées, sharp pour les images, Cloudinary pour le stockage
- API Claude (vision) pour lire les photos, via @anthropic-ai/sdk, modèle dans CLAUDE_MODEL
- Frontend : TanStack Query, React Router, Tailwind, interface en français

## Domaine (vocabulaire du cahier)
- Journée : une date, un camion, un chauffeur ; contient des voyages, des dépenses, des mouvements d'argent et un solde écrit (« Reste », « Reste vola »).
- Voyage : numéro entouré (numérotation continue d'un jour à l'autre), produit, quantité (« 1 Vgs » = 1 voyage), origine → destination, montant (« Frais » / « Vola »), retenue éventuelle (« 120000 - 50000 »).
- Produits : Fasika = sable, Biriky = brique, Moellon, Gravillon, Hazo = bois, Déménagement.
- Statut d'un voyage : payé ; service (« service tsy vola » = gratuit, montant 0) ; en attente (« Miandry vola » = créance).
- Dépenses : sakafo = repas, G.O = gasoil, dokera = chargeurs, police, motard, croix, ristourne, achat de marchandise (vidim-pasika, vidina gravillon).
- Mouvements : apport (« Vola tany an-trano »), total écrit (« Total vola »), autre (ex. « Vola Ambohipanja »).

## Règle de calcul d'une journée
solde = Σ(montant − retenue) des voyages payés + apports − Σ dépenses
Les voyages « service » et « en attente » ne comptent pas dans la caisse.

## Créances
- Un voyage « en attente » est une créance, soldée par un ou plusieurs paiements (table Paiement).
- Paiement encaissé (CAISSE) : le montant entre dans la caisse du camion le jour du paiement.
- Paiement hors caisse (HORS_CAISSE) : la créance est soldée, mais le montant ne compte pas dans la caisse.
- Caisse d'une période = Σ soldes calculés des journées validées + Σ paiements encaissés de la période.
- Le solde d'une journée (comparé au « Reste » écrit) ne change pas : les paiements de créances n'y entrent pas.

## Principes
- L'IA propose, l'utilisateur valide : aucune donnée extraite n'entre en base « validée » sans action humaine.
- On garde toujours la photo source et le JSON brut de l'extraction, liés aux lignes créées.
- Montants en Ariary, entiers, jamais de float.
- Code et commentaires lisibles, noms de domaine en français (journee, voyage, depense), tests pour toute règle de calcul.
- Prototype de référence : dossier cahier-extract/ (schema.js, prompt.js, merge.js, validate.js, lieux.js).