# Drag Follow Finger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire suivre un déchet (et son voisin) sous le doigt dès le premier contact, avant l'animation de transition du swap.

**Architecture:** Toute la géométrie de décision (axe verrouillé, case voisine, clamp à une case, seuil de validation) est extraite dans un module pur `dragMath`, testé en TDD avec vitest. `GridRenderer` gagne une petite API de drag purement visuelle (déplacement des sprites, pas de modèle). `InputRouter` câble les deux : `pointermove` pilote le suivi live au lieu de déclencher le swap, `pointerup` décide validation (>50 %) ou annulation, et conserve le repli tap-tap. `GameScreen.handleSwap` est inchangé.

**Tech Stack:** TypeScript, Pixi.js 8, gsap 3, vitest 2.

## Global Constraints

- Le drag est **purement visuel** jusqu'à la validation : le tableau `tiles` de `GridRenderer` n'est jamais modifié pendant le drag (modèle inchangé via le chemin existant `applySwapInModel`).
- `AXIS_LOCK_PX = 6` (px) — micro-seuil de verrouillage d'axe / démarrage du suivi.
- `COMMIT_RATIO = 0.5` — fraction de case au-delà de laquelle le relâchement valide le swap.
- `TAP_DEADZONE_RATIO = 0.3` — conservé pour le repli tap-tap (valeur actuelle).
- Suivi borné à ±1 case ; en bord de grille (pas de voisin), le déchet reste calé (offset 0).
- Pas de modification des durées/easings existants ; le snap-back réutilise `ANIM.swapValid`.
- Spec de référence : `docs/superpowers/specs/2026-06-25-drag-follow-finger-design.md`.

---

### Task 1: Module pur `dragMath` (géométrie du drag)

**Files:**
- Create: `src/input/dragMath.ts`
- Test: `src/input/dragMath.test.ts`

**Interfaces:**
- Consumes: `Pos` (depuis `@/game/grid`, import type-only).
- Produces (utilisé par Task 3) :
  - `type Axis = 'x' | 'y'`
  - `resolveAxis(dx: number, dy: number, lockPx: number): Axis | null`
  - `neighborOf(cell: Pos, axis: Axis, delta: number): Pos | null`
  - `clampOffset(delta: number, tile: number): number`
  - `shouldCommit(offset: number, tile: number, commitRatio: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/input/dragMath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveAxis, neighborOf, clampOffset, shouldCommit } from './dragMath';

describe('resolveAxis', () => {
  it('returns null while both axes stay under lockPx', () => {
    expect(resolveAxis(3, -4, 6)).toBeNull();
  });
  it('locks to x when horizontal movement dominates', () => {
    expect(resolveAxis(20, 5, 6)).toBe('x');
  });
  it('locks to y when vertical movement dominates', () => {
    expect(resolveAxis(4, -20, 6)).toBe('y');
  });
  it('prefers x on a tie', () => {
    expect(resolveAxis(10, 10, 6)).toBe('x');
  });
});

describe('neighborOf', () => {
  const cell = { row: 3, col: 3 };
  it('returns the right cell when dragging x positive', () => {
    expect(neighborOf(cell, 'x', 12)).toEqual({ row: 3, col: 4 });
  });
  it('returns the left cell when dragging x negative', () => {
    expect(neighborOf(cell, 'x', -12)).toEqual({ row: 3, col: 2 });
  });
  it('returns the cell below when dragging y positive', () => {
    expect(neighborOf(cell, 'y', 12)).toEqual({ row: 4, col: 3 });
  });
  it('returns null when delta is zero', () => {
    expect(neighborOf(cell, 'x', 0)).toBeNull();
  });
});

describe('clampOffset', () => {
  it('keeps an offset within one tile', () => {
    expect(clampOffset(40, 100)).toBe(40);
  });
  it('clamps a positive offset to +tile', () => {
    expect(clampOffset(180, 100)).toBe(100);
  });
  it('clamps a negative offset to -tile', () => {
    expect(clampOffset(-180, 100)).toBe(-100);
  });
});

describe('shouldCommit', () => {
  it('commits past half a tile', () => {
    expect(shouldCommit(60, 100, 0.5)).toBe(true);
  });
  it('does not commit below half a tile', () => {
    expect(shouldCommit(40, 100, 0.5)).toBe(false);
  });
  it('does not commit exactly at half (strict)', () => {
    expect(shouldCommit(50, 100, 0.5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/input/dragMath.test.ts`
Expected: FAIL — `Failed to resolve import "./dragMath"` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/input/dragMath.ts`:

```ts
import type { Pos } from '@/game/grid';

export type Axis = 'x' | 'y';

/** Axe dominant une fois le mouvement au-delà de lockPx ; null tant que c'est un quasi-appui. */
export function resolveAxis(dx: number, dy: number, lockPx: number): Axis | null {
  if (Math.abs(dx) < lockPx && Math.abs(dy) < lockPx) return null;
  return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
}

/** Case voisine candidate dans la direction du drag (signe de delta) ; null si delta nul. */
export function neighborOf(cell: Pos, axis: Axis, delta: number): Pos | null {
  const dir = Math.sign(delta);
  if (dir === 0) return null;
  return axis === 'x'
    ? { row: cell.row, col: cell.col + dir }
    : { row: cell.row + dir, col: cell.col };
}

/** Décalage signé borné à ±tile (suivi limité à une case). */
export function clampOffset(delta: number, tile: number): number {
  return Math.max(-tile, Math.min(tile, delta));
}

/** Vrai si le déchet a été tiré au-delà de commitRatio d'une case. */
export function shouldCommit(offset: number, tile: number, commitRatio: number): boolean {
  return Math.abs(offset) / tile > commitRatio;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/input/dragMath.test.ts`
Expected: PASS — 14 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/input/dragMath.ts src/input/dragMath.test.ts
git commit -m "feat(input): pure drag geometry helpers (axis lock, neighbor, clamp, commit)"
```

---

### Task 2: API de drag visuelle dans `GridRenderer`

**Files:**
- Modify: `src/render/GridRenderer.ts`

**Interfaces:**
- Consumes: `getTile`, `cellToPixel`, `ANIM.swapValid`, `gsap` (déjà présents) ; `Pos`.
- Produces (utilisé par Task 3) :
  - `beginDrag(cell: Pos): void`
  - `updateDrag(axis: 'x' | 'y', neighbor: Pos | null, offset: number): void`
  - `cancelDrag(): gsap.core.Timeline`
  - `endDrag(): void`

Ces méthodes manipulent uniquement les positions pixel des sprites ; elles ne touchent jamais le tableau `tiles`.

- [ ] **Step 1: Add drag state fields**

Dans `src/render/GridRenderer.ts`, après la ligne `layout: GridLayout;` (≈ ligne 22), ajouter les champs d'état du drag :

```ts
  private dragTile: TileSprite | null = null;
  private dragHome = { x: 0, y: 0 };
  private dragNeighborCell: Pos | null = null;
  private dragNeighborTile: TileSprite | null = null;
  private dragNeighborHome = { x: 0, y: 0 };
```

- [ ] **Step 2: Add the drag methods**

Dans `src/render/GridRenderer.ts`, juste avant `swapVisual(a: Pos, b: Pos)` (≈ ligne 129), insérer :

```ts
  /** Mémorise le déchet tiré et sa position d'origine (début d'un geste de drag). */
  beginDrag(cell: Pos): void {
    this.dragTile = this.getTile(cell.row, cell.col);
    this.dragHome = this.cellToPixel(cell.row, cell.col);
    this.dragNeighborCell = null;
    this.dragNeighborTile = null;
  }

  /**
   * Suit le doigt : décale le déchet tiré de +offset et le voisin de -offset sur l'axe.
   * `offset` est signé et déjà clampé à ±tile par l'appelant. Si le voisin change
   * (le doigt repasse de l'autre côté), l'ancien voisin est remis à sa place.
   */
  updateDrag(axis: 'x' | 'y', neighbor: Pos | null, offset: number): void {
    if (!this.dragTile) return;

    const changed =
      (neighbor?.row ?? -1) !== (this.dragNeighborCell?.row ?? -1) ||
      (neighbor?.col ?? -1) !== (this.dragNeighborCell?.col ?? -1);
    if (changed) {
      if (this.dragNeighborTile) {
        this.dragNeighborTile.x = this.dragNeighborHome.x;
        this.dragNeighborTile.y = this.dragNeighborHome.y;
      }
      this.dragNeighborCell = neighbor;
      this.dragNeighborTile = neighbor ? this.getTile(neighbor.row, neighbor.col) : null;
      if (neighbor) this.dragNeighborHome = this.cellToPixel(neighbor.row, neighbor.col);
    }

    if (axis === 'x') {
      this.dragTile.x = this.dragHome.x + offset;
      this.dragTile.y = this.dragHome.y;
      if (this.dragNeighborTile) {
        this.dragNeighborTile.x = this.dragNeighborHome.x - offset;
        this.dragNeighborTile.y = this.dragNeighborHome.y;
      }
    } else {
      this.dragTile.y = this.dragHome.y + offset;
      this.dragTile.x = this.dragHome.x;
      if (this.dragNeighborTile) {
        this.dragNeighborTile.y = this.dragNeighborHome.y - offset;
        this.dragNeighborTile.x = this.dragNeighborHome.x;
      }
    }
  }

  /** Ramène le déchet tiré et le voisin à leur place (relâchement sans validation). */
  cancelDrag(): gsap.core.Timeline {
    const tl = gsap.timeline();
    if (this.dragTile) {
      tl.to(this.dragTile, { x: this.dragHome.x, y: this.dragHome.y, ...ANIM.swapValid }, 0);
    }
    if (this.dragNeighborTile) {
      tl.to(
        this.dragNeighborTile,
        { x: this.dragNeighborHome.x, y: this.dragNeighborHome.y, ...ANIM.swapValid },
        0,
      );
    }
    this.clearDrag();
    return tl;
  }

  /** Libère l'état de drag sans bouger les sprites (chemin de validation). */
  endDrag(): void {
    this.clearDrag();
  }

  private clearDrag(): void {
    this.dragTile = null;
    this.dragNeighborCell = null;
    this.dragNeighborTile = null;
  }
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/render/GridRenderer.ts
git commit -m "feat(render): visual drag API on GridRenderer (begin/update/cancel/end)"
```

---

### Task 3: Câbler le suivi live dans `InputRouter`

**Files:**
- Modify: `src/input/InputRouter.ts`

**Interfaces:**
- Consumes: `resolveAxis`, `neighborOf`, `clampOffset`, `shouldCommit`, `Axis` (Task 1) ; `beginDrag`, `updateDrag`, `cancelDrag`, `endDrag` (Task 2) ; `grid.layout`, `grid.setSelection`, `grid.pixelToCell`, `grid.cellToPixel` (existants).
- Produces: comportement de drag-suivi ; l'événement `SwapIntent` émis reste identique (consommé par `GameScreen.handleSwap`, inchangé).

Cette tâche remplace `pointermove`/`pointerup` : `pointermove` ne déclenche plus le swap mais pilote le suivi ; le swap est décidé au `pointerup`. Le repli tap-tap est conservé.

- [ ] **Step 1: Replace the whole file**

Remplacer intégralement le contenu de `src/input/InputRouter.ts` par :

```ts
import type { FederatedPointerEvent } from 'pixi.js';
import type { GridRenderer } from '@/render/GridRenderer';
import type { Pos } from '@/game/grid';
import { resolveAxis, neighborOf, clampOffset, shouldCommit, type Axis } from './dragMath';

export interface SwapIntent { a: Pos; b: Pos; }

// Le déchet suit le doigt dès AXIS_LOCK_PX (verrou d'axe). Au relâchement, le swap
// est validé s'il a été tiré au-delà de COMMIT_RATIO d'une case ; sinon retour en
// place. Sous TAP_DEADZONE_RATIO, le geste retombe sur la sélection tap-tap.
const AXIS_LOCK_PX = 6;
const COMMIT_RATIO = 0.5;
const TAP_DEADZONE_RATIO = 0.3;

export class InputRouter {
  private downCell: Pos | null = null;
  private downX = 0;
  private downY = 0;
  private selected: Pos | null = null;
  private dragging = false;
  private dragAxis: Axis | null = null;
  private dragOffset = 0;
  private dragNeighbor: Pos | null = null;
  private listeners = new Set<(intent: SwapIntent) => void>();
  private enabled = true;

  constructor(private readonly grid: GridRenderer) {
    grid.container.eventMode = 'static';
    grid.container.on('pointerdown', this.handlePointerDown);
    grid.container.on('globalpointermove', this.handlePointerMove);
    grid.container.on('pointerup', this.handlePointerUp);
    grid.container.on('pointerupoutside', this.handlePointerUp);
  }

  setEnabled(v: boolean): void { this.enabled = v; }

  onSwap(cb: (intent: SwapIntent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getSelected(): Pos | null { return this.selected; }

  setSelected(p: Pos | null): void { this.selected = p; this.grid.setSelection(p); }

  private emit(intent: SwapIntent): void {
    for (const cb of this.listeners) cb(intent);
  }

  private inBounds(p: Pos): boolean {
    const px = this.grid.cellToPixel(p.row, p.col);
    return this.grid.pixelToCell(px.x, px.y) !== null;
  }

  private endGesture(): void {
    this.downCell = null;
    this.dragging = false;
    this.dragAxis = null;
    this.dragOffset = 0;
    this.dragNeighbor = null;
  }

  private applyTapTap(cell: Pos): void {
    if (this.selected) {
      if (cell.row === this.selected.row && cell.col === this.selected.col) {
        this.selected = null;
      } else if (Math.abs(cell.row - this.selected.row) + Math.abs(cell.col - this.selected.col) === 1) {
        const a = this.selected;
        this.selected = null;
        this.emit({ a, b: cell });
      } else {
        this.selected = cell;
      }
    } else {
      this.selected = cell;
    }
  }

  private handlePointerDown = (e: FederatedPointerEvent): void => {
    if (!this.enabled) return;
    const cell = this.grid.pixelToCell(e.global.x, e.global.y);
    if (!cell) return;
    this.downCell = cell;
    this.downX = e.global.x;
    this.downY = e.global.y;
    this.dragging = false;
    this.dragAxis = null;
    this.dragOffset = 0;
    this.dragNeighbor = null;
    this.grid.beginDrag(cell);
    this.grid.setSelection(cell); // feedback immédiat sur la case pressée
  };

  private handlePointerMove = (e: FederatedPointerEvent): void => {
    if (!this.enabled || !this.downCell) return;
    const dx = e.global.x - this.downX;
    const dy = e.global.y - this.downY;

    const axis = this.dragAxis ?? resolveAxis(dx, dy, AXIS_LOCK_PX);
    if (!axis) return; // encore un quasi-appui : rien ne bouge
    this.dragAxis = axis;
    this.dragging = true;

    const { tileW, tileH } = this.grid.layout;
    const tile = axis === 'x' ? tileW : tileH;
    const delta = axis === 'x' ? dx : dy;

    let neighbor = neighborOf(this.downCell, axis, delta);
    if (neighbor && !this.inBounds(neighbor)) neighbor = null;
    const offset = neighbor ? clampOffset(delta, tile) : 0;

    this.dragNeighbor = neighbor;
    this.dragOffset = offset;
    this.grid.updateDrag(axis, neighbor, offset);
  };

  private handlePointerUp = (e: FederatedPointerEvent): void => {
    if (!this.enabled || !this.downCell) return;
    const dx = e.global.x - this.downX;
    const dy = e.global.y - this.downY;
    const { tileW, tileH } = this.grid.layout;
    const downCell = this.downCell;

    if (this.dragging) {
      const tile = this.dragAxis === 'x' ? tileW : tileH;
      const neighbor = this.dragNeighbor;
      const commit = neighbor !== null && shouldCommit(this.dragOffset, tile, COMMIT_RATIO);
      this.endGesture();

      if (commit && neighbor) {
        this.grid.endDrag();
        this.selected = null;
        this.grid.setSelection(null);
        this.emit({ a: downCell, b: neighbor });
        return;
      }

      this.grid.cancelDrag();
      const deadzone = Math.min(tileW, tileH) * TAP_DEADZONE_RATIO;
      if (Math.abs(dx) <= deadzone && Math.abs(dy) <= deadzone) {
        const cell = this.grid.pixelToCell(e.global.x, e.global.y) ?? downCell;
        this.applyTapTap(cell);
      } else {
        this.selected = null;
      }
      this.grid.setSelection(null);
      return;
    }

    // pur appui (jamais de drag) : sélection tap-tap
    this.endGesture();
    this.grid.endDrag();
    const cell = this.grid.pixelToCell(e.global.x, e.global.y) ?? downCell;
    this.applyTapTap(cell);
    // La case éclaircie s'estompe dès qu'on relâche le doigt (le surlignage est un feedback d'appui).
    this.grid.setSelection(null);
  };
}
```

- [ ] **Step 2: Verify the whole project type-checks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Verify existing tests still pass**

Run: `npm run test`
Expected: PASS (dragMath tests pass ; rien d'autre cassé).

- [ ] **Step 4: Commit**

```bash
git add src/input/InputRouter.ts
git commit -m "feat(input): waste follows finger on drag before swap transition

Le déchet tiré et son voisin glissent sous le doigt dès le premier contact
(axe verrouillé, borné à une case). Au relâchement, swap validé au-delà de
50% d'une case, sinon retour en place. Repli tap-tap conservé."
```

---

### Task 4: Vérification manuelle dans l'app

**Files:** aucun (vérification comportementale).

- [ ] **Step 1: Lancer l'app**

Run: `npm run dev`
Ouvrir l'URL affichée et démarrer une partie.

- [ ] **Step 2: Vérifier le ressenti**

Confirmer point par point (cf. spec) :
- Le déchet glisse sous le doigt dès le premier mouvement (axe X ou Y).
- Le déchet voisin glisse en sens inverse en même temps.
- Le suivi est borné à une case ; en bord de grille le déchet reste calé.
- Relâché au-delà de la moitié → le swap part sans à-coup (animation depuis la position courante).
- Relâché en deçà de la moitié → les deux déchets reviennent en place.
- Un swap invalide (pas de match) glisse puis revient (swapAndUndo).
- Un appui bref (sous la deadzone) sélectionne via tap-tap ; un second tap adjacent échange.

- [ ] **Step 3: Si un ajustement de feel est nécessaire**

Régler `AXIS_LOCK_PX` (réactivité du premier contact) et/ou `COMMIT_RATIO` (tolérance de validation) en tête de `src/input/InputRouter.ts`, puis recommitter.

---

## Notes sur les tests

Ce dépôt n'a aucun test existant et le rendu est fortement couplé à Pixi/gsap (canvas, sprites). La logique de décision est donc isolée dans le module pur `dragMath` (Task 1), couvert par TDD vitest. Le câblage `GridRenderer`/`InputRouter` (manipulation de sprites, gsap, événements Pixi) est vérifié par le type-check (`tsc -b`) et la vérification manuelle dans l'app (Task 4) — il n'est pas raisonnablement testable en unitaire sans harnais de rendu, hors périmètre de cette feature.
