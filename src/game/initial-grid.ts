import type { LevelConfig } from './levels';
import type { Grid } from './grid';
import { createEmptyGrid, getCell, setCell } from './grid';
import { findValidMoves } from './matching';
import type { Prng } from './prng';
import type { Cell } from './grid';
import type { WasteCategory } from './waste';
import { WASTE_META } from './waste-data';

function catOf(cell: Cell): WasteCategory | null {
  return cell === null ? null : (WASTE_META[cell]?.category ?? null);
}

export function createInitialGrid(level: LevelConfig, prng: Prng): Grid {
  const MAX_ATTEMPTS = 100;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = fillNoMatch(level, prng);
    if (findValidMoves(grid).length > 0) return grid;
  }
  throw new Error(`createInitialGrid: failed to converge after ${MAX_ATTEMPTS} attempts for level ${level.level}`);
}

function fillNoMatch(level: LevelConfig, prng: Prng): Grid {
  const n = level.size;
  const grid = createEmptyGrid(n, n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // Interdit les catégories qui formeraient un combo de 3 (par famille) à la pose.
      const forbidden = new Set<WasteCategory>();
      if (c >= 2) {
        const a = catOf(getCell(grid, r, c - 1));
        if (a !== null && a === catOf(getCell(grid, r, c - 2))) forbidden.add(a);
      }
      if (r >= 2) {
        const a = catOf(getCell(grid, r - 1, c));
        if (a !== null && a === catOf(getCell(grid, r - 2, c))) forbidden.add(a);
      }
      const candidates = level.wasteTypes.filter((t) => !forbidden.has(WASTE_META[t]!.category));
      const pick = candidates.length > 0
        ? candidates[prng.intRange(0, candidates.length - 1)]!
        : level.wasteTypes[prng.intRange(0, level.wasteTypes.length - 1)]!;
      setCell(grid, r, c, pick);
    }
  }
  return grid;
}
