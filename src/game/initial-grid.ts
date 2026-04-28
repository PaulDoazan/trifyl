import type { LevelConfig } from './levels';
import type { Grid } from './grid';
import { createEmptyGrid, getCell, setCell } from './grid';
import { findValidMoves } from './matching';
import type { Prng } from './prng';
import type { WasteType } from './waste';

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
      const forbidden = new Set<WasteType>();
      if (c >= 2 && getCell(grid, r, c - 1) === getCell(grid, r, c - 2)) {
        const v = getCell(grid, r, c - 1);
        if (v !== null) forbidden.add(v);
      }
      if (r >= 2 && getCell(grid, r - 1, c) === getCell(grid, r - 2, c)) {
        const v = getCell(grid, r - 1, c);
        if (v !== null) forbidden.add(v);
      }
      const candidates = level.wasteTypes.filter((t) => !forbidden.has(t));
      const pick = candidates.length > 0
        ? candidates[prng.intRange(0, candidates.length - 1)]!
        : level.wasteTypes[prng.intRange(0, level.wasteTypes.length - 1)]!;
      setCell(grid, r, c, pick);
    }
  }
  return grid;
}
