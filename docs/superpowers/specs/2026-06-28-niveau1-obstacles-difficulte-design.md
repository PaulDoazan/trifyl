# Niveau 1 — obstacles, reshuffle sans défaite, fix de victoire

Date : 2026-06-28

## Contexte et problèmes

Le niveau 1 du jeu Match-3 éducatif (tri des déchets) présente trois problèmes :

1. **Trop facile.** Le matching se fait **par famille de couleur** (`catOf` → `WASTE_META[cell].category`, voir [matching.ts](../../../src/game/matching.ts)), et il n'existe que 3 catégories matchables (jaune / noir / orange) sur une grille 5×5. La densité de cases de même couleur est ~33 %, donc chaque recharge (`refillTop`) recrée très souvent un match : après un seul bon coup, les cascades s'enchaînent toutes seules et le joueur n'a presque rien à faire.

2. **Victoire déclarée trop tard (bug).** Dans [GameScreen.handleSwap](../../../src/ui/screens/GameScreen.ts), le test `allBinsFull()` est exécuté **après** la boucle des cascades. Quand les poubelles se remplissent en plein milieu d'une chaîne, la partie attend que toutes les cascades restantes soient résolues avant de déclarer la victoire.

3. **Pas de filet anti-blocage.** Aujourd'hui `isOver = pas de match && pas de coup valide` → défaite. C'est rarissime avec 3 couleurs, mais on veut explicitement remplacer ce cas par une redistribution.

## Décisions de design (validées)

- On **conserve le matching par famille de couleur** (le tri pédagogique par couleur reste intact).
- On introduit des **obstacles** : tuiles qui ne matchent jamais et cassent les alignements, pour réduire les cascades automatiques.
- Comportement de l'obstacle : **tombe avec la gravité**, **sort par le bas** de la grille quand il atteint la dernière ligne, **non échangeable**.
- Pour qu'il y ait toujours des obstacles, ils sont **réinjectés par le haut** via le refill à un taux réglable (sinon ils sortent tous et le niveau redevient facile).
- Visuel : **bloc neutre dessiné par code** (placeholder remplaçable par un asset plus tard).
- Sur blocage (plus aucun coup valide) : **reshuffle sans défaite** + message « On redistribue la grille ! ». La défaite (`EndOverlay` sur blocage) ne se déclenche plus.

## Architecture

### 1. Type obstacle (`src/game/obstacle.ts`)

Source de vérité unique :

```ts
export const OBSTACLE_TYPE = '__obstacle__';
export function isObstacle(cell: Cell): boolean { return cell === OBSTACLE_TYPE; }
```

L'obstacle est une valeur de cellule distincte (non `null`, donc soumise à la gravité) mais **absente de `WASTE_META`**. Conséquence directe : `catOf` (qui fait `WASTE_META[cell]?.category ?? null`) renvoie déjà `null` pour un obstacle → il **casse les runs** et n'est **jamais flaggé** comme match. Aucune modification du cœur de `findMatches` n'est nécessaire.

### 2. Config par niveau

Ajout dans `game_configs.json`, `config-loader.ts` et `LevelConfig` :

- `obstacleRate: number` — probabilité (0..1) qu'une case rechargée soit un obstacle (injection « bonus » au-delà du plancher). Niveau 1 : `0`. Niveaux 2/3 : `0`.
- `obstacleInitial: number` — nombre d'obstacles présents au démarrage (placés hors dernière ligne). Niveau 1 : `4`. Niveaux 2/3 : `0`.
- `obstacleMin: number` — **plancher** d'obstacles maintenu à l'écran : à chaque refill, on réinjecte par le haut de quoi remonter à ce seuil. Niveau 1 : `4`. Niveaux 2/3 : `0`.

Ces champs sont optionnels et valent `0` par défaut, donc les niveaux 2 et 3 ne changent pas. Comme un obstacle sort dès qu'il atteint le bas, le plancher fait que dès qu'un obstacle quitte la grille, un nouveau réapparaît en haut : un flux permanent d'au moins `obstacleMin` obstacles, même avec `obstacleRate` à 0. La grille initiale est ensemencée à `max(obstacleInitial, obstacleMin)`.

### 3. Matching (`matching.ts`)

- **L'obstacle est échangeable** comme une tuile normale : un swap déchet↔obstacle est validé s'il **crée un combo** (le déchet déplacé aligne une famille), sinon annulé comme tout swap stérile. Seul l'échange de deux obstacles est rejeté (catégories `null` égales → aucun combo possible). `isValidSwap` reste donc inchangé hors ce point.
- (matching/flood-fill inchangé : l'obstacle est déjà neutre via `catOf`.)

### 4. Cascade (`cascade.ts`)

- `refillTop(grid, level, prng)` : pour chaque case vide, tire un obstacle avec probabilité `level.obstacleRate`, sinon un type de déchet comme aujourd'hui.
- `applyCascade` : à chaque itération, en plus des matches, repérer les **obstacles présents sur la dernière ligne** ; les retirer (éjection). La boucle continue tant qu'il y a **des matches OU des éjections**. Chaque `CascadeStep` gagne un champ `ejected: Pos[]`.
  - Ordre par itération : (a) repérer matches + obstacles bas ; (b) vider ces cellules ; (c) `applyGravity` ; (d) `refillTop` (peut injecter de nouveaux obstacles en haut).
- Les obstacles éjectés **ne remplissent aucune poubelle**.

### 5. Grille initiale (`initial-grid.ts`)

- Après avoir construit une grille sans match, placer `obstacleInitial` obstacles sur des cases aléatoires **hors dernière ligne**, puis re-vérifier qu'au moins un coup valide existe (boucle de tentatives existante).

### 6. Reshuffle (`src/game/reshuffle.ts`)

- `reshuffleGrid(grid, level, prng)` : conserve les obstacles à leur place, mélange les **types de déchets non-obstacles** dans les cases non-obstacles, en garantissant **aucun match immédiat** et **au moins un coup valide** (mêmes invariants que `createInitialGrid`).
- Déclenché quand, après résolution d'un swap, la grille n'a **ni match ni coup valide**. La progression des poubelles est conservée. Plus de défaite sur blocage.

### 7. Fix de victoire (`GameScreen.ts`)

- Déplacer le test `allBinsFull()` **dans** la boucle `for (const event of result.events)`, juste après l'incrément `binCombos`. Dès que les 3 poubelles atteignent leur max d'étages : `finished = true`, couper l'input, `onLevelComplete()`, et **`break`** pour interrompre les cascades restantes.

### 8. Rendu et UI

- **Texture obstacle** : générée par code dans `FileAssetProvider.init()` à partir d'un `<canvas>` (carré sombre arrondi + symbole « interdit »), stockée sous `OBSTACLE_TYPE`. `getTileTexture(OBSTACLE_TYPE)` la renvoie.
- **Animation d'éjection** : dans `GridRenderer`, les obstacles éjectés glissent vers le bas et sortent sous la grille (puis sprite détruit), distinct du vol vers la poubelle.
- **Toast de redistribution** : petit bandeau DOM stylé « On redistribue la grille ! » affiché ~1,5 s puis fondu, avant de repeupler la grille reshufflée. Pas d'asset requis.

## Flux d'un swap (après changements)

```
swap valide → applyCascade
  boucle: matches + obstacles(dernière ligne)
    → vol des déchets vers poubelle / éjection des obstacles par le bas
    → binCombos += 1 par combo
    → SI allBinsFull → victoire immédiate (break)   ← fix
    → gravité + refill (peut injecter obstacles)
fin boucle
  → SI ni match ni coup valide → reshuffle + toast   ← filet anti-blocage
```

## Hors périmètre

- Les niveaux 2 et 3 (obstacleRate/obstacleInitial = 0).
- Tout vrai asset graphique d'obstacle (placeholder dessiné en attendant).
- Réglage fin des valeurs `0.12` / `4` (à ajuster par playtest).

## Tests

Logique pure testée avec Vitest :
- `matching` : un obstacle ne matche jamais ; un swap touchant un obstacle est invalide.
- `cascade` : `refillTop` injecte selon le taux (PRNG déterministe) ; un obstacle en dernière ligne est éjecté ; la boucle continue sur éjection seule.
- `initial-grid` : `obstacleInitial` obstacles placés, aucun en dernière ligne, coup valide garanti.
- `reshuffle` : aucun match immédiat, au moins un coup valide, obstacles préservés.
