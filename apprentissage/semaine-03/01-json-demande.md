# Étape 1 — Demander du JSON dans le prompt

Fichiers : [prompts/journee.js](prompts/journee.js) (`PROMPT_JSON_DEMANDE`), [prompts/lexique.js](prompts/lexique.js),
[scripts/json-demande.js](scripts/json-demande.js).

## Pourquoi du JSON ?

En semaine 2, le modèle répondait par du texte étiqueté :

```
VOYAGE n°7 : 2 voyages de sable, Ampasika → Ivato, 120000 Ar, retenue 50000 Ar, payé
```

C'est lisible pour un humain, mais pour un **programme**, il faudrait découper ce texte avec des expressions régulières
fragiles. DiaBook a besoin de **données** : un numéro, un montant, un statut, à mettre dans une base et à additionner.
Le format des données entre programmes, c'est le **JSON** :

```json
{
  "type": "voyage",
  "numero": 7,
  "quantite": 2,
  "produit": "sable",
  "origine": "Ampasika",
  "destination": "Ivato",
  "montant": 120000,
  "retenue": 50000,
  "statut": "paye"
}
```

En JavaScript, `JSON.parse(texte)` transforme ce texte en objet : `objet.montant` vaut alors le **nombre** `120000`.

## Première méthode : le demander dans le prompt

Le prompt montre la forme attendue et dit « Réponds UNIQUEMENT avec un objet JSON ».
Les blocs communs (rôle, lexique, règles) sont maintenant rangés dans [prompts/lexique.js](prompts/lexique.js) :
on **assemble** un prompt à partir de blocs, au lieu de tout recopier.

## Résultats (`npm run json-demande`, 7 lignes, température 0)

**6 réponses sur 7 sont lisibles par `JSON.parse`.** Celle qui casse est la première :

````
Texte brut reçu : "```json\n{\n  \"elements\": [ … ] }\n```"
❌ JSON.parse a échoué : Unexpected token '`', "```json …" is not valid JSON
````

Le JSON est **juste**, mais le modèle l'a entouré de ` ```json … ``` `. C'est la façon d'afficher du code en Markdown,
qu'il a vue des millions de fois pendant son entraînement. Le prompt dit pourtant « UNIQUEMENT un objet JSON »,
et les 6 autres réponses ont respecté la consigne : **avec le même prompt, la forme change d'une réponse à l'autre**.

Autre détail : pour `Kapoaka 3000`, le modèle a mis le montant dans le texte (`"texte": "Kapoaka 3000"`).
Le format ne prévoyait pas de montant pour un élément inconnu : l'information est perdue pour le programme.

## Ce qu'il faut retenir

1. Un modèle **produit du texte**. Demander du JSON dans le prompt, c'est demander un texte qui ressemble à du JSON :
   **rien ne le garantit**.
2. Une seule réponse mal formée sur 7 suffit à faire planter un programme qui fait `JSON.parse` sans précaution.
3. Même quand `JSON.parse` réussit, le **contenu** peut être faux : un montant en texte (`"120 000"`), un statut inventé,
   un champ manquant. `JSON.parse` ne vérifie que la syntaxe, pas le sens.

Les étapes suivantes règlent ces deux problèmes :

- **étape 2** : l'API **impose** la forme (`responseMimeType` + schéma) ;
- **étape 3** : le code **vérifie** le contenu (Zod).

## Exercice : la « rustine » `extraireJSON()`

Avant `JSON.parse`, on nettoie la réponse ([scripts/json-demande.js](scripts/json-demande.js)) :

1. on enlève les balises ` ```json ` et ` ``` ` ;
2. on garde seulement ce qui va du premier `{` au dernier `}`.

Résultat : **7/7 réponses lisibles**. Les balises sont apparues cette fois sur les lignes **2 et 5**,
et non plus sur la ligne 1 : encore une preuve que la forme change d'un appel à l'autre.

### Pourquoi c'est fragile

La rustine ne répare que les défauts **qu'on a prévus**. Testée sur des réponses imaginaires :

| Réponse du modèle                              | Après `extraireJSON` + `JSON.parse`               |
| ---------------------------------------------- | ------------------------------------------------- |
| ` ```json {"a":1} ``` `                        | ✅ réparée                                        |
| `Voici le JSON : {"a":1} Bonne journée !`      | ✅ réparée                                        |
| `{"a":1} et aussi {"b":2}` (deux objets)       | ❌ le texte entre les deux objets reste au milieu |
| `{"a":1,}` (virgule en trop)                   | ❌ JSON invalide                                  |
| `{"montant": 120 000}` (espace dans un nombre) | ❌ JSON invalide                                  |

Et même réparée, la réponse peut avoir un **contenu** faux (statut inventé, montant en texte) :
la rustine ne regarde que la forme. Chaque nouveau défaut demanderait une nouvelle rustine.

**La vraie solution est de ne pas laisser le modèle choisir la forme** : c'est l'étape 2.
