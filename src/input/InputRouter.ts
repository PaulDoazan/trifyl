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
