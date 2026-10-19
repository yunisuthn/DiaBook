Système de design d'un portfolio personnel de développeur·se : **technique, précis, un seul accent**. La page ressemble à une feuille de calage d'imprimeur posée sur un plan d'architecte : papier graphite chaud, encre presque noire, une grille de points, et un orange vermillon « signal » qui ne sert qu'à pointer.

## Principes

1. **Une seule couleur parle.** `signal` (vermillon) marque l'action principale, l'élément actif et les index. Tout le reste est `ink`, `ink-muted` et des filets.
2. **Carré par défaut.** Cartes et panneaux en `radius-0` ; boutons, champs, tags en `radius-sm` (2px). Rien n'est rond sauf les points de statut (`radius-dot`).
3. **Tout est numéroté.** Sections `01`, `02`… ; projets `P/01`, `P/02`… en mono `index` / `code`, couleur `signal-text`.
4. **Le mono pour les métadonnées, le sans pour les idées.** Titres et texte en Schibsted Grotesk ; libellés, tags, boutons, dates, coordonnées en Martian Mono capitales (`label`).
5. **Pas d'ombre floue.** L'élévation est un décalage dur (`shadow-offset`), uniquement au survol.

## Ton et rédaction

- Phrases courtes, à la première personne : « Je conçois des outils de paie et de reporting qui tiennent en production. »
- Un résumé de projet = un résultat, pas une liste d'outils : « Calcul des congés payés et reprise des agents sans ressaisie. »
- Casse de phrase partout ; les capitales viennent du style `label`, ne les tapez pas.
- Pas d'emoji, pas de superlatifs (« passionné », « innovant »), pas de chiffres de remplissage.
- Dates et lieux en mono : `2026`, `Antananarivo · UTC+3`.

## Couleur

- Fond de page `bg`, panneaux `surface`, puits (code, vignettes) `surface-sunk`.
- Texte `ink` ; texte secondaire `ink-muted`. Les deux dépassent 6:1 sur les trois fonds, dans les deux thèmes.
- `signal` est un **fond**, jamais une couleur de texte : le texte posé dessus est `on-signal`. Pour l'accent en texte (liens, index, anneau de focus), utilisez `signal-text`.
- `line` pour les filets décoratifs ; `line-strong` pour toute bordure de contrôle (≥3:1). `grid` uniquement pour la grille de points et les repères.
- `live` / `live-soft` uniquement pour le statut « disponible », toujours accompagné d'un mot.
- Thème sombre : mêmes rôles ; le décalage `shadow-offset` y devient vermillon.

## Typographie

- Familles : `sans` = Schibsted Grotesk (Google Fonts, 400–800), `mono` = Martian Mono (Google Fonts, 300–600). `components/bundle.css` les importe ; une page qui n'utilise que `tokens.css` doit charger les deux depuis Google Fonts.
- Échelle : `display-xl` (hero, une fois), `display`, `h1`, `h2` ; `body-lg` pour les chapôs, `body` pour la lecture (mesure max `measure`, 68ch), `small` pour les aides.
- Mono : `index` pour les grands numéros, `label` pour libellés/nav/tags/boutons, `code` pour le code et les données.
- Interlettrage négatif sur les titres (déjà dans les styles) ; jamais d'italique décorative.

## Espacement et mise en page

- Grille de 4px : `space-1` à `space-24`. Padding des cartes `space-6` ; entre sections `space-24` ; marge latérale desktop `space-16`.
- 12 `columns` sur `container` 1120px, `gutter` 24px ; 4 colonnes sous 720px.
- Le fond de page peut porter une grille de points `grid` au pas `space-6`, uniquement dans le hero.

## Formes, états et mouvement

- Signature : les **repères de calage** — deux équerres de 9px en `signal-text` aux coins opposés d'une ProjectCard. Ne les ajoutez pas ailleurs.
- Focus clavier : contour plein 2px `signal-text`, décalé de 2px (≥4.7:1 sur chaque fond). Jamais retiré.
- Survol : décalage −2px,−2px + `shadow-offset`, en 120ms par paliers (`steps(2)`) : un mouvement mécanique, pas élastique. Rien ne bouge avec `prefers-reduced-motion`.
- Désactivé : opacité 45 %, aucun survol.

## Iconographie et images

- Pas de jeu d'icônes : les seuls signes sont des glyphes mono (→ ↗ _ / ·). Si des icônes deviennent nécessaires, prendre un jeu au trait 1.5px carré et le documenter ici.
- Pas de logo : le nom s'écrit en minuscules en sans 700, suivi d'un `_` mono en `signal-text` (voir NavBar).
- Captures de projets : cadre `surface-sunk`, bordure `line`, sans arrondi ni ombre.

## Composants

`window.Onisoa` (React 18) : Button, Tag, Status, SectionHeader, ProjectCard, NavBar, Field. Chacun a son guide dans `components/<Nom>/README.md`.
