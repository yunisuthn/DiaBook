# Étape 4 — Conversation sur plusieurs tours

Fichiers : [scripts/discuter.js](scripts/discuter.js), `PROMPT_CONVERSATION` dans [prompts/cahier.js](prompts/cahier.js).

## L'idée : le modèle n'a pas de mémoire, c'est nous qui en avons une

L'API est **sans état** : chaque appel est indépendant, le modèle ne se souvient de rien.
Une « conversation », c'est un tableau de messages que **notre programme** garde et **renvoie en entier à chaque tour** :

```
tour 1 : [exemples] + ligne 1
tour 2 : [exemples] + ligne 1 + réponse 1 + ligne 2
tour 3 : [exemples] + ligne 1 + réponse 1 + ligne 2 + réponse 2 + correction
…
```

```js
const contents = [...exemples, ...historique, message]; // tout ce qui part au modèle
// … appel …
historique.push(message, { role: 'model', parts: [{ text: reponse }] }); // on mémorise le tour
```

Le SDK propose aussi `ai.chats.create()`, qui fait la même chose automatiquement.
On l'a écrit à la main pour **voir** ce qui se passe.

## Pourquoi c'est utile pour DiaBook

- **Corriger une lecture en dialoguant** : « Correction : le voyage 1 transportait du gravillon ».
  L'humain reste maître, comme sur l'écran de validation.
- **Poser une question sur la page** : « Question : quel est le montant du voyage 2 ? ».
- Plus tard : se souvenir de la page précédente (numéro du dernier voyage, date).

## Résultats

### Avec mémoire (`npm run discuter`)

| Tour | Message                                              | Réponse                              | Tokens d'entrée |
| ---: | ---------------------------------------------------- | ------------------------------------ | --------------: |
|    1 | `Fasika 1vgs ① Ivato -> Anosy Vola 70000`            | VOYAGE n°1 : … sable, … payé         |           1 278 |
|    2 | `Biriky 1vgs ② … Miandry vola 60000`                 | VOYAGE n°2 : … brique, … en attente  |           1 338 |
|    3 | `Correction : le voyage 1 transportait du gravillon` | VOYAGE n°1 : … **gravillon** …       |           1 394 |
|    4 | `Question : quel est le montant du voyage 2 ?`       | Le montant du voyage 2 est 60000 Ar. |           1 441 |

L'entrée **grossit à chaque tour** : tout l'historique est renvoyé. Total cumulé : 5 451 tokens pour 4 tours.
Sur une longue conversation, le coût total augmente donc de plus en plus vite. C'est pour ça qu'on offre `/oublier`
(nouvelle page = historique vide).

### Sans mémoire (`npm run discuter -- --sans-memoire`)

| Message                                              | Réponse                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| `Fasika 1vgs ① …`                                    | VOYAGE n°1 : … sable … ✅                                        |
| `Correction : le voyage 1 transportait du gravillon` | **VOYAGE n°12 : 1 voyage de bois, Andoharanofotsy → Itaosy…** ❌ |
| `Question : quel est le montant du voyage 1 ?`       | « Je ne trouve pas cette information dans les lignes lues. » ✅  |

- La question : le modèle **ne sait plus** et le dit honnêtement, comme le demande le prompt.
- La correction : le modèle n'a pas trouvé de voyage 1… alors il a « corrigé » **le premier exemple few-shot** (voyage n°12) !

### Leçon : le modèle ne distingue pas les exemples de la vraie conversation

Les exemples sont envoyés comme de faux échanges `user` / `model`. Pour le modèle, ce sont des lignes **déjà lues**,
exactement comme les vraies. Tant qu'il y a de vraies lignes dans l'historique, ça ne se voit pas.
Sans elles, il se rabat sur les exemples.

C'est une forme d'**injection** : du contenu qui n'est pas une instruction est pris pour une partie de la tâche.
On y reviendra en semaine 11. Pistes pour l'éviter : voir l'exercice.
