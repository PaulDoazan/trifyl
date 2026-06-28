# Suivi du déchet sous le doigt avant le swap

Date : 2026-06-25
Statut : design validé, à implémenter

## Problème

Aujourd'hui, quand on déplace un déchet, rien ne suit le doigt entre le premier
contact et le déclenchement du swap :

- `pointerdown` éclaircit la case pressée (highlight) mais le déchet reste fixe.
- `pointermove` déclenche le swap d'un coup dès que le doigt dépasse **une case
  entière** (`FIRE_RATIO = 1.0`), puis l'animation de transition joue.

L'utilisateur n'a donc aucun retour tactile « dès le premier contact » : il ne
sent pas qu'il peut déplacer le déchet.

## Objectif

Dès que le doigt bouge sur un déchet, celui-ci doit glisser sous le doigt
(retour immédiat), donnant la sensation de pouvoir le déplacer dès le premier
contact, avant que l'animation de transition ne prenne le relais.

## Comportement cible

1. **Suivi live, axe verrouillé.** Dès que le doigt bouge au-delà d'un micro-seuil
   (`AXIS_LOCK_PX`, ~6 px), l'axe dominant (X ou Y) est verrouillé et le déchet
   tiré suit le doigt **immédiatement** sur cet axe.
2. **Le voisin glisse en sens inverse.** Le déchet voisin dans la direction du
   drag glisse de la même amplitude en sens opposé (feel type Candy Crush :
   les deux déchets se croisent en suivant le doigt).
3. **Suivi borné à une case.** Le déplacement est clampé à ±1 case : on ne peut
   pas tirer un déchet au-delà de sa case voisine. En bord de grille (pas de
   voisin dans la direction tirée), le déchet reste calé (pas de glissement dans
   le vide).
4. **Changement de direction.** Si le doigt repasse de l'autre côté de la case
   d'origine, le voisin change : l'ancien voisin revient à sa place et le nouveau
   se met à glisser.
5. **Validation au relâchement (> 50 %).** Au `pointerup`, si le déchet a été tiré
   à plus de 50 % d'une case (`COMMIT_RATIO = 0.5`) et qu'un voisin valide existe,
   le swap est validé : l'animation de transition (`swapVisual` / `swapAndUndo`)
   repart de la position courante des sprites, sans à-coup. Sinon, les deux
   déchets reviennent doucement à leur place (retour animé).
6. **Tap-tap conservé.** Si le mouvement total reste sous la deadzone actuelle
   (`TAP_DEADZONE_RATIO`, ~30 % de case) et que le swap n'a pas été validé, le
   geste retombe sur la sélection tap-tap existante (premier tap sélectionne,
   tap adjacent échange). Le déchet revient en place dans ce cas. Les deux modes
   d'entrée coexistent.

## Découpage technique

Aucun changement de modèle de jeu : le drag est purement visuel jusqu'à la
validation. Le tableau `tiles` n'est jamais modifié pendant le drag ; il ne l'est
qu'à la validation, via le chemin existant (`applySwapInModel`).

### `GridRenderer` — nouvelle API de drag

`GridRenderer` possède déjà les sprites (`tiles`) et le layout ; il porte donc
l'état visuel du drag. État interne : le déchet tiré et sa position d'origine, le
voisin actuellement déplacé et sa position d'origine.

- `beginDrag(cell: Pos): void`
  Mémorise le déchet de `cell` et sa position pixel d'origine. Réinitialise le
  voisin courant à `null`.

- `updateDrag(axis: 'x' | 'y', neighbor: Pos | null, offset: number): void`
  Déplace le déchet tiré de `+offset` sur `axis`, et le voisin de `−offset` sur
  le même axe. `offset` est signé et déjà clampé à `±tile` par l'appelant. Si
  `neighbor` diffère du voisin actuellement déplacé, l'ancien voisin est remis
  à sa place (instantané, le doigt pilote) avant de déplacer le nouveau. Si
  `neighbor` est `null` (bord), seul le déchet tiré bouge (et l'appelant aura
  clampé `offset` à 0).

- `cancelDrag(): gsap.core.Timeline`
  Ramène en tween le déchet tiré et le voisin à leur position d'origine, puis
  libère l'état de drag.

- `endDrag(): void`
  Libère l'état de drag **sans** déplacer les sprites (chemin de validation :
  `swapVisual` / `swapAndUndo` reprennent depuis la position courante).

### `InputRouter` — pilotage du suivi

- `pointerdown` : comme aujourd'hui (mémorise `downCell`, position, highlight) +
  `grid.beginDrag(downCell)`.
- `pointermove` : ne déclenche **plus** le swap. Tant que le mouvement reste sous
  `AXIS_LOCK_PX`, ne bouge rien. Au-delà : verrouille l'axe dominant (une fois),
  calcule la direction (signe du delta) et le voisin, clampe `offset` à `±tile`
  (et à 0 si le voisin est hors grille), puis appelle `grid.updateDrag(...)`.
- `pointerup` :
  - Si un drag a eu lieu : `fraction = |offset| / tile` sur l'axe verrouillé.
    - `fraction > COMMIT_RATIO` et voisin valide → `grid.endDrag()` puis
      `emit({ a: downCell, b: neighbor })` (la validation/animation reste dans
      `GameScreen.handleSwap`).
    - sinon → `grid.cancelDrag()` ; et si le mouvement total est sous la deadzone,
      appliquer la logique tap-tap existante.
  - Si aucun drag (pur appui) : logique tap-tap existante.
- Constantes : `FIRE_RATIO` est remplacé par `AXIS_LOCK_PX` (~6 px) et
  `COMMIT_RATIO = 0.5`. `TAP_DEADZONE_RATIO` est conservé pour le repli tap-tap.

### `GameScreen.handleSwap` — inchangé

Il lit toujours les cases d'origine (`getTile(a)`, `getTile(b)`) et anime depuis
la position courante des sprites. Comme le drag ne touche pas le tableau `tiles`,
le déchet tiré est en `home + offset` et le voisin en `home − offset` au moment
de la validation ; `swapVisual` les tween jusqu'à leurs cases cibles sans
discontinuité. Pour un swap invalide, `swapAndUndo` part également de la position
courante (le déchet poursuit jusqu'au swap complet puis revient), ce qui se lit
comme « essai infructueux ».

## Hors périmètre

- Pas de résistance « rubber-band » en bord de grille (le déchet reste calé).
- Le highlight de case reste sur la case d'origine et s'estompe au relâchement
  (comportement actuel inchangé).
- Pas de changement aux durées/easings d'animation existants.
