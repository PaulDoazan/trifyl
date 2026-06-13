import type { FederatedPointerEvent } from 'pixi.js';
import type { GridRenderer } from '@/render/GridRenderer';
import type { Pos } from '@/game/grid';

export interface SwapIntent { a: Pos; b: Pos; }

// Drag fires the swap as soon as the pointer crosses the center of the target tile
// (i.e., delta ≥ 1 tile width on the dominant axis). Below TAP_DEADZONE_RATIO the
// gesture is treated as a tap (used by tap-tap selection); between deadzone and
// fire threshold the gesture is dropped (an incomplete drag, no swap).
const FIRE_RATIO = 1.0;
const TAP_DEADZONE_RATIO = 0.3;

export class InputRouter {
  private downCell: Pos | null = null;
  private downX = 0;
  private downY = 0;
  private selected: Pos | null = null;
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

  setSelected(p: Pos | null): void { this.selected = p; }

  private emit(intent: SwapIntent): void {
    for (const cb of this.listeners) cb(intent);
  }

  private inBounds(p: Pos): boolean {
    const px = this.grid.cellToPixel(p.row, p.col);
    return this.grid.pixelToCell(px.x, px.y) !== null;
  }

  private fireSwap(target: Pos): void {
    if (!this.downCell) return;
    const a = this.downCell;
    this.downCell = null;
    this.selected = null;
    if (this.inBounds(target)) this.emit({ a, b: target });
  }

  private handlePointerDown = (e: FederatedPointerEvent): void => {
    if (!this.enabled) return;
    const cell = this.grid.pixelToCell(e.global.x, e.global.y);
    if (!cell) return;
    this.downCell = cell;
    this.downX = e.global.x;
    this.downY = e.global.y;
  };

  private handlePointerMove = (e: FederatedPointerEvent): void => {
    if (!this.enabled || !this.downCell) return;
    const dx = e.global.x - this.downX;
    const dy = e.global.y - this.downY;
    const { tileW, tileH } = this.grid.layout;

    if (Math.abs(dx) >= Math.abs(dy)) {
      const fireThreshold = tileW * FIRE_RATIO;
      if (dx >= fireThreshold) {
        this.fireSwap({ row: this.downCell.row, col: this.downCell.col + 1 });
      } else if (dx <= -fireThreshold) {
        this.fireSwap({ row: this.downCell.row, col: this.downCell.col - 1 });
      }
    } else {
      const fireThreshold = tileH * FIRE_RATIO;
      if (dy >= fireThreshold) {
        this.fireSwap({ row: this.downCell.row + 1, col: this.downCell.col });
      } else if (dy <= -fireThreshold) {
        this.fireSwap({ row: this.downCell.row - 1, col: this.downCell.col });
      }
    }
  };

  private handlePointerUp = (e: FederatedPointerEvent): void => {
    if (!this.enabled || !this.downCell) return;
    const dx = e.global.x - this.downX;
    const dy = e.global.y - this.downY;
    const { tileW, tileH } = this.grid.layout;
    const deadzone = Math.min(tileW, tileH) * TAP_DEADZONE_RATIO;
    const movedFar = Math.abs(dx) > deadzone || Math.abs(dy) > deadzone;

    if (movedFar) {
      // an incomplete drag (moved past deadzone but never reached fire threshold)
      this.downCell = null;
      return;
    }

    // pure tap: feed into tap-tap selection
    const cell = this.grid.pixelToCell(e.global.x, e.global.y) ?? this.downCell;
    this.downCell = null;
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
  };
}
