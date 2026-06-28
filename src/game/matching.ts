import type { Cell, Grid, Pos } from './grid';
import { areAdjacent, cloneGrid, getCell, swapCells } from './grid';
import type { WasteCategory } from './waste';
import { WASTE_META } from './waste-data';

export interface MatchGroup {
  category: WasteCategory;
  cells: Pos[];
}

/** Famille (couleur/catégorie) d'une case ; null si vide. Le matching se fait par famille. */
function catOf(cell: Cell): WasteCategory | null {
  return cell === null ? null : (WASTE_META[cell]?.category ?? null);
}

export function findMatches(grid: Grid): MatchGroup[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return [];

  const flagged: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      const prev = catOf(getCell(grid, r, c - 1));
      const cur = c < cols ? catOf(getCell(grid, r, c)) : null;
      const breakRun = prev === null || cur !== prev;
      if (breakRun) {
        const len = c - runStart;
        if (prev !== null && len >= 3) {
          for (let k = runStart; k < c; k++) flagged[r]![k] = true;
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      const prev = catOf(getCell(grid, r - 1, c));
      const cur = r < rows ? catOf(getCell(grid, r, c)) : null;
      const breakRun = prev === null || cur !== prev;
      if (breakRun) {
        const len = r - runStart;
        if (prev !== null && len >= 3) {
          for (let k = runStart; k < r; k++) flagged[k]![c] = true;
        }
        runStart = r;
      }
    }
  }

  const visited: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const groups: MatchGroup[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!flagged[r]![c] || visited[r]![c]) continue;
      const category = catOf(getCell(grid, r, c))!;
      const cells: Pos[] = [];
      const stack: Pos[] = [{ row: r, col: c }];
      while (stack.length) {
        const p = stack.pop()!;
        if (!flagged[p.row]?.[p.col] || visited[p.row]![p.col]) continue;
        if (catOf(getCell(grid, p.row, p.col)) !== category) continue;
        visited[p.row]![p.col] = true;
        cells.push(p);
        stack.push({ row: p.row + 1, col: p.col });
        stack.push({ row: p.row - 1, col: p.col });
        stack.push({ row: p.row, col: p.col + 1 });
        stack.push({ row: p.row, col: p.col - 1 });
      }
      groups.push({ category, cells });
    }
  }

  return groups;
}

export function isValidSwap(grid: Grid, a: Pos, b: Pos): boolean {
  if (!areAdjacent(a, b)) return false;
  const va = getCell(grid, a.row, a.col);
  const vb = getCell(grid, b.row, b.col);
  if (va === null || vb === null) return false;
  // Même famille : échanger ne change aucune catégorie sur la grille, donc aucun combo possible.
  // (Deux obstacles ont tous deux une catégorie `null` → également rejetés ici.)
  if (catOf(va) === catOf(vb)) return false;
  const trial = cloneGrid(grid);
  swapCells(trial, a, b);
  return findMatches(trial).length > 0;
}

export interface ValidMove { a: Pos; b: Pos; }

export function findValidMoves(grid: Grid): ValidMove[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const moves: ValidMove[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const here: Pos = { row: r, col: c };
      const right: Pos = { row: r, col: c + 1 };
      const down: Pos = { row: r + 1, col: c };
      if (c + 1 < cols && isValidSwap(grid, here, right)) moves.push({ a: here, b: right });
      if (r + 1 < rows && isValidSwap(grid, here, down)) moves.push({ a: here, b: down });
    }
  }
  return moves;
}
