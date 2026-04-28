import type { FederatedPointerEvent } from 'pixi.js';
import type { GridRenderer } from '@/render/GridRenderer';
import type { Pos } from '@/game/grid';

export interface SwapIntent { a: Pos; b: Pos; }

const DRAG_THRESHOLD_RATIO = 0.3;

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

  private handlePointerDown = (e: FederatedPointerEvent): void => {
    if (!this.enabled) return;
    const cell = this.grid.pixelToCell(e.global.x, e.global.y);
    if (!cell) return;
    this.downCell = cell;
    this.downX = e.global.x;
    this.downY = e.global.y;
  };

  private handlePointerUp = (e: FederatedPointerEvent): void => {
    if (!this.enabled || !this.downCell) return;
    const dx = e.global.x - this.downX;
    const dy = e.global.y - this.downY;
    const tileSize = this.grid.layout.tileSize;
    const threshold = tileSize * DRAG_THRESHOLD_RATIO;
    const isDrag = Math.abs(dx) > threshold || Math.abs(dy) > threshold;

    if (isDrag) {
      const dir = Math.abs(dx) > Math.abs(dy)
        ? { row: 0, col: dx > 0 ? 1 : -1 }
        : { row: dy > 0 ? 1 : -1, col: 0 };
      const target = { row: this.downCell.row + dir.row, col: this.downCell.col + dir.col };
      this.selected = null;
      if (this.grid.pixelToCell(this.grid.cellToPixel(target.row, target.col).x, this.grid.cellToPixel(target.row, target.col).y)) {
        this.emit({ a: this.downCell, b: target });
      }
    } else {
      const cell = this.grid.pixelToCell(e.global.x, e.global.y);
      if (!cell) { this.downCell = null; return; }
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
    this.downCell = null;
  };
}
