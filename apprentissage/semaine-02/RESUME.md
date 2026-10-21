# Semaine 2 — Résumé : prompt engineering

Fiche de révision : ce qu'on a fait, ce qu'il faut retenir, et la checklist de validation.
LLM : **Gemini** (offre gratuite), modèle `gemini-flash-lite-latest`. Toutes les lignes de cahier sont **inventées**.

---

## ✅ Étape 1 — Anatomie d'un prompt

Cours : [01-anatomie-d-un-prompt.md](01-anatomie-d-un-prompt.md) · Script : `npm run comparer`

- Deux places pour le texte : les **instructions système** (le cadre, écrit une fois) et le **message** (la donnée, à chaque appel).
- Les **5 ingrédients** d'un prompt : rôle, tâche, contexte, contraintes, format.
- Sans prompt, la ligne Fasika donnait une réponse en anglais, avec un calcul inventé et 263 tokens de sortie.
  Avec un prompt : une phrase juste, 43 tokens.
- **Paradoxe du coût** : un prompt plus long en entrée peut coûter **moins cher**, parce que la sortie raccourcit.

## ✅ Étape 2 — Le prompt « lecteur de cahier » (v1, puis v1_1)

Cours : [02-prompt-lecteur-de-cahier.md](02-prompt-lecteur-de-cahier.md) · Script : `npm run lire`

- **Lexique complet** du cahier, déclaré « seule source de vérité » ; mot hors lexique → `INCONNU`
  (Kapoaka n'est plus deviné).
- **Format étiqueté** (`VOYAGE`, `DÉPENSE`, `MOUVEMENT`, `SOLDE ÉCRIT`, `INCONNU`) : vérifiable par un programme.
- **On versionne le prompt** : on ne modifie jamais une version publiée, on en crée une nouvelle (v1 → v1_1).
- **Des règles qui se contredisent** (Service « montant 0 » / « non écrit ») : le modèle en choisit une.
- **Pour corriger, ajouter une consigne plutôt que retirer un exemple** (« ⑦ → 7 »).
- Le prompt système est **renvoyé à chaque appel** : 5 936 tokens d'entrée pour 235 de sortie sur 7 lignes.
- Ce que tu as apporté du terrain : Service = **payé à la maison** ; numérotation qui **repart à 1 chaque semaine**
  (corrigé aussi dans `CLAUDE.md`, PR n°2).

## ✅ Étape 3 — Apprendre par l'exemple (few-shot, v2)

Cours : [03-apprendre-par-l-exemple.md](03-apprendre-par-l-exemple.md)

- _Zero-shot_ = des instructions seulement ; _few-shot_ = des instructions + quelques exemples.
- Les exemples sont envoyés comme de faux échanges `user` → `model`.
- **Une seule chose change à la fois** : v2 = mêmes instructions que v1_1 + 4 exemples.
- Les exemples rendent la **forme** régulière (« 1 voyage », « 50000 Ar », « montant non écrit »).
- Bons exemples : **inventés**, **différents des lignes de test**, centrés sur les cas difficiles, **parfaitement justes**.
- Ton test de l'exemple faux (« Hazo » traduit « sable ») : ici, le lexique l'a emporté. Mais face à une contradiction,
  le modèle choisit : rien ne le garantit.

## ✅ Étape 4 — Conversation sur plusieurs tours

Cours : [04-conversation.md](04-conversation.md) · Script : `npm run discuter`

- L'API est **sans état** : c'est le programme qui garde l'historique et le renvoie **en entier à chaque tour**.
- Utile pour DiaBook : « Correction : … » et « Question : … » sur une page.
- L'entrée **grossit à chaque tour** (1 278 → 1 441 tokens en 4 tours) : `/oublier` à chaque nouvelle page.
- Ton exercice : les exemples envoyés comme échanges étaient **pris pour des lignes de la page**.
  - La **piste A** (ajouter des consignes) a échoué ;
  - la **piste B** (écrire les exemples dans le prompt système) a réussi.
  - **Quand une consigne n'est pas suivie, il faut parfois changer la forme de ce qu'on envoie.**

## ✅ Étape 5 — Comparer les versions

Cours : [05-comparer-les-versions.md](05-comparer-les-versions.md) · Script : `npm run evaluer`

| Version | Justes | Format | Entrée |
| ------- | -----: | -----: | -----: |
| v0      |    2/7 |    0/7 |  2 254 |
| v1      |    6/7 |    4/7 |  5 936 |
| v1_1    |    7/7 |    7/7 |  6 237 |
| v2      |    7/7 |    7/7 |  7 854 |

- On note automatiquement grâce à des **attendus** : mots obligatoires, alternatives, mots interdits.
- **Une évaluation ne mesure que ce qu'on vérifie** : v1_1 et v2 ont la même note, alors que v2 écrit mieux.
- **15 requêtes par minute** sur l'offre gratuite : on espace les appels (4 s entre deux requêtes).

---

# Récapitulatif : ce que j'ai appris en semaine 2

1. Un bon prompt donne au modèle **tout ce qu'il ne peut pas deviner** : rôle, tâche, contexte, contraintes, format.
2. Pour DiaBook, l'ingrédient clé est le **lexique du cahier**, déclaré seule source de vérité. Sans lui, le modèle invente.
3. Un **format étiqueté** se vérifie par un programme. C'est le pont vers le JSON de la semaine 3.
4. Un prompt se **versionne** et se **relit comme un contrat** : aucune règle ne doit en contredire une autre.
5. Les **exemples** (few-shot) règlent la forme mieux que des règles. Ils doivent être justes et différents des tests.
6. Une conversation, c'est un **historique renvoyé à chaque tour** : utile, mais l'entrée grossit à chaque tour.
7. Ce qui est envoyé comme conversation est pris pour la conversation : il faut parfois **changer la structure**, pas les mots.
8. On compare des prompts sur des **chiffres** ; une évaluation ne voit que ce qu'on lui fait vérifier.

---

# ✅ Checklist de validation de la semaine 2

**Comprendre**

- [ ] Je sais expliquer la différence entre instructions système et message.
- [ ] Je connais les 5 ingrédients d'un prompt, et lequel compte le plus pour DiaBook (le contexte : le lexique).
- [ ] Je sais pourquoi un prompt plus long peut coûter moins cher.
- [ ] Je sais pourquoi on versionne un prompt, et pourquoi on ne modifie pas une version publiée.
- [ ] Je sais ce qu'est le few-shot, et comment choisir de bons exemples.
- [ ] Je sais pourquoi le modèle « se souvient » dans une conversation, et pourquoi le coût grandit.

**Pratique**

- [ ] `npm run comparer` : je vois la différence entre la ligne seule et le prompt construit.
- [ ] `npm run lire -- --version v1_1` : les 7 lignes sont lues sans rien inventer, Kapoaka sort en `INCONNU`.
- [ ] `npm run discuter` : une correction et une question fonctionnent ; `--sans-memoire` ne touche plus aux exemples.
- [ ] `npm run evaluer` : j'obtiens le tableau de comparaison des 4 versions.

**Livrable**

- [ ] `prompts/cahier.js` contient v0, v1, v1_1 et v2, chacune avec un commentaire qui dit ce qui change.
- [ ] Chaque étape a été livrée dans une PR, avec des commits à mon nom.

**Critère de réussite :** sur 5 lignes de cahier, aucun mot malagasy n'est inventé. ✅ (v1_1 et v2, sur 7 lignes)

➡️ Semaine suivante : **sorties structurées (JSON)** — voir [PLAN-12-SEMAINES.md](../PLAN-12-SEMAINES.md).
