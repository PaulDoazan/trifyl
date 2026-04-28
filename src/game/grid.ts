import type { WasteType } from './waste';

export type Cell = WasteType | null;
export type Grid = Cell[][];

export interface Pos { row: number; col: number; }
export interface Bounds { rows: number; cols: number; }

export function createEmptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null as Cell));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

export function inBounds(b: Bounds, row: number, col: number): boolean {
  return row >= 0 && row < b.rows && col >= 0 && col < b.cols;
}

export function getCell(g: Grid, row: number, col: number): Cell {
  return g[row]?.[col] ?? null;
}

export function setCell(g: Grid, row: number, col: number, value: Cell): void {
  const r = g[row];
  if (!r) throw new Error(`row ${row} out of bounds`);
  r[col] = value;
}

export function areAdjacent(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function swapCells(g: Grid, a: Pos, b: Pos): void {
  const va = getCell(g, a.row, a.col);
  const vb = getCell(g, b.row, b.col);
  setCell(g, a.row, a.col, vb);
  setCell(g, b.row, b.col, va);
}
