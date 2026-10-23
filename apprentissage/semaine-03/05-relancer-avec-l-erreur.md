# Étape 5 — Quand le JSON est invalide : relancer avec l'erreur

Fichiers : [lib/extraction.js](lib/extraction.js), [lib/avertissements.js](lib/avertissements.js),
[lib/comparaison.js](lib/comparaison.js), [scripts/relance.js](scripts/relance.js), [scripts/journee.js](scripts/journee.js).

## Valide n'est pas conforme

À l'exercice J11, le script affichait ✅ même quand l'`attendu` ne correspondait pas.
Il y a en fait **deux questions différentes** :

| Question                                                    | Qui répond                            | Disponible en production ?          |
| ----------------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| **Valide** : la forme et les règles sont-elles respectées ? | Zod                                   | oui, à chaque extraction            |
| **Conforme** : est-ce bien ce qui est écrit sur la page ?   | `comparerAttendu()` (données de test) | non : c'est l'utilisateur qui relit |

[lib/comparaison.js](lib/comparaison.js) compare la date, le nombre de voyages, de dépenses et le Reste à l'`attendu`.
`npm run journee` affiche maintenant `✔ JSON valide`, puis `✅ conforme` ou chaque écart (`≠ reste : attendu …, lu …`).

## La relance

Quand Zod refuse une réponse, relancer **le même appel** ne sert à rien : à température 0, le modèle redonnerait
la même réponse. On lui envoie donc une **conversation** (comme en semaine 2, étape 4) :

```
[user]  la page du cahier
[model] sa réponse refusée
[user]  « Ta réponse a été refusée par la validation : <message de Zod>.
         Relis la page et renvoie la journée corrigée.
         Ne devine rien pour faire disparaître l'erreur : une information qui n'est pas écrite reste null. »
```

Le message de Zod dit **quoi** corriger et **où** (`→ at elements[0].retenue`). On ne relance qu'**une fois** :
si c'est encore refusé, `extraireJournee()` lève une `ErreurExtraction` qui garde **toutes** les réponses brutes
(`err.tentatives`), et la page est signalée à l'utilisateur.

`npm run relance -- --hors-ligne` le montre avec un **faux client** (même forme que le vrai `ai.models.generateContent`,
mais il renvoie des réponses écrites à la main) : on peut tester la relance sans appeler l'API, et sans attendre
que le modèle se trompe.

## Ce qui s'est passé en vrai : le modèle « triche »

Page piégée : un voyage « Miandry vola » **sans montant écrit**.

```
10-10-26
* Biriky 1vgs ⑬ Manandriana -> Itaosy Frais 95000
* Fasika 1vgs ⑭ Ampasika -> Ivato Miandry vola
Sakafo 12000
Reste vola 83000
```

Avec la règle de l'exercice de l'étape 3 (« un voyage en attente doit avoir un montant ») :

1. 1re réponse : voyage ⑭ en attente, `montant: null` → **refusée** par Zod. La lecture était pourtant **juste**.
2. Relance : le modèle a changé le voyage en `{ "type": "inconnu", "texte": "Fasika 1vgs ⑭ … Miandry vola" }`.
   Zod n'a plus rien à refuser → **acceptée**. Un voyage a disparu, sans aucun message. (3 fois sur 3.)

**La relance pousse le modèle à satisfaire le validateur, pas forcément à mieux lire.**
Il n'a pas inventé de montant ; il a trouvé une autre sortie. Ça n'est utile que pour une vraie **erreur de lecture**.

## Refus ou avertissement ?

| Situation                                      | Exemple                                       | Ce qu'on fait                              |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| **Erreur de lecture** : le modèle s'est trompé | retenue plus grande que le montant (inversés) | **refus** Zod → relance avec l'erreur      |
| **Cahier incomplet** : le modèle a bien lu     | voyage en attente sans montant écrit          | **avertissement** → l'utilisateur complète |

La règle « en attente ⇒ montant » est donc sortie du schéma Zod ([schemas/ligne-zod.js](schemas/ligne-zod.js))
et devenue un avertissement dans [lib/avertissements.js](lib/avertissements.js).
`extraireJournee()` renvoie maintenant `{ journee, brut, usage, appels, tentatives, avertissements }` :

```
✔ valide après 1 appel(s)
⚠️  voyage 14 en attente sans montant écrit : à compléter par l’utilisateur (elements[1].montant)
```

C'est le principe de DiaBook : **l'IA propose, l'utilisateur valide**. On ne perd pas toute une page pour un champ manquant.

## Le garde-fou

Même avec cette correction, la triche reste possible pour d'autres règles. Après une relance, `valider()` compare
le nombre de voyages de la réponse refusée et de la nouvelle : **s'il a baissé, la réponse est refusée**
(`la relance a fait disparaître 1 voyage(s) (1 → 0)`). Une relance doit **corriger**, pas **supprimer**.

## Résultats

`npm run journee -- --toutes` :

```
11/11 JSON valides (11 du premier coup, 0 après relance, 0 refusée) · 11/11 conformes à l’attendu
tokens : entrée 11 660, sortie ≈ 4 250
```

**Critère de la semaine atteint** : 10 journées → 10 JSON valides du premier coup (et la J11 en plus).
La relance n'a pas servi sur ces données : elles sont tapées proprement. Elle servira avec les photos (semaine 4),
où les erreurs de lecture seront bien plus fréquentes.

Coût d'une relance : environ **le double** de l'appel normal (la page, la réponse refusée et le message sont renvoyés).
C'est pour ça qu'on ne relance qu'une fois.

## Ce qu'il faut retenir

1. **Valide ≠ conforme.** Zod vérifie la forme et les règles ; seul un humain (ou un `attendu`) sait ce qui est écrit.
2. **Relancer avec l'erreur**, jamais à l'identique : le modèle a besoin de savoir quoi corriger.
3. **Une seule relance**, puis on signale, en gardant toutes les réponses brutes.
4. **Un refus doit viser une erreur de lecture.** Si le cahier lui-même est incomplet, c'est un avertissement :
   sinon le modèle « corrige » en cachant ou en inventant.
5. **Se méfier d'une relance qui réussit** : vérifier qu'elle n'a rien fait disparaître.
