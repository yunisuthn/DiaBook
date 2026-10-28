# Semaine 4 — Vision : lire une photo

Objectif : envoyer au modèle la **photo** d'une page du cahier, au lieu de son texte tapé, et obtenir la même journée
en JSON validé. On réutilise tout ce qui a été construit en semaine 3 (schéma Zod, relance, avertissements).
LLM : Gemini (offre gratuite), comme les semaines précédentes. Toutes les pages sont **inventées**.

## Installation

```bash
cd apprentissage/semaine-04
npm install
cp ../semaine-03/.env .env      # même clé que les semaines précédentes
npm run images                  # étape 1 : fabrique images/J01.png … J11.png à partir des journées inventées
npm run photo                   # étape 1 : lit les 3 premières images
npm run photo -- J04 --avec-texte   # une image, et le texte tapé de la même page pour comparer
npm run photo -- --toutes       # les 11 images (≈ 1 minute)
npm run cout-image              # étape 2 : prix selon la taille, page prise de loin, poids du fichier
npm run cout-image -- --hors-ligne  # seulement le poids du fichier, sans appel à l'API
npm run photo -- --toutes --resolution low --preparer  # étape 2 : basse résolution, image préparée
```

## Organisation

```
semaine-04/
├── 01-envoyer-une-image.md   ← étape 1 : inlineData, base64, même schéma, ce que coûte une image
├── 02-cout-d-une-image.md    ← étape 2 : budget fixe (mediaResolution), recadrer, préparer avec sharp
├── lib/gemini.js             ← client Gemini (copie des semaines précédentes)
├── lib/extraction.js         ← extraireJournee(ai, page) : page = texte tapé OU photo { image, mimeType }
├── lib/avertissements.js     ← copie de la semaine 3 (règles « si » / « avertir »)
├── lib/comparaison.js        ← comparerAttendu (semaine 3) ; étape 2 : comparerNombres (tous les nombres)
├── lib/image.js              ← étape 2 : preparerImage() → rotation EXIF, recadrage, taille, JPEG
├── donnees/journees.js       ← les 11 journées inventées de la semaine 3, avec leur attendu
├── prompts/lexique.js        ← blocs réutilisables : rôle, lexique, règles
├── prompts/journee.js        ← PROMPT_JOURNEE (texte) et PROMPT_PHOTO (photo : que faire de l'illisible)
├── schemas/                  ← copie de la semaine 3 (ligne-zod.js, journee-zod.js)
├── scripts/fabriquer-images.js ← étape 1 : dessine chaque journée sur une page lignée (sharp)
├── scripts/photo.js          ← étapes 1-2 : envoie les images au modèle (--resolution, --preparer)
├── scripts/cout-image.js     ← étape 2 : les trois mesures du coût d'une image
└── images/                   ← images fabriquées (non versionnées : npm run images)
```

## Progression

- [x] Étape 1 — Envoyer une image au modèle : `inlineData`, même schéma, coût d'une image
- [x] Étape 2 — Le coût d'une image : budget fixe, résolution, recadrer et préparer avec sharp
- [ ] Étape 3 — De vraies pages écrites à la main : ombre, flou, rotation, recadrage
- [ ] Étape 4 — Upload d'une photo : Express + multer, on garde la photo source et le JSON brut
- [ ] Étape 5 — Page React « Importer » : photo → JSON affiché ; bilan sur 5 pages + checklist

**Critère de réussite :** sur 5 pages de test, les voyages et les montants sont lus ; ce qui est illisible est signalé.
