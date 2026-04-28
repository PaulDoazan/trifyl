import type { Grid, Pos } from './grid';
import { getCell, setCell } from './grid';
import { findMatches, type MatchGroup } from './matching';
import type { LevelConfig } from './levels';
import type { Prng } from './prng';
import type { WasteType } from './waste';

export interface DropMove {
  from: Pos;
  to: Pos;
  type: WasteType;
}

export interface RefillAddition {
  to: Pos;
  type: WasteType;
}

export function applyGravity(grid: Grid): DropMove[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const moves: DropMove[] = [];
  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      const cell = getCell(grid, r, c);
      if (cell !== null) {
        if (writeRow !== r) {
          setCell(grid, writeRow, c, cell);
          setCell(grid, r, c, null);
          moves.push({ from: { row: r, col: c }, to: { row: writeRow, col: c }, type: cell });
        }
        writeRow--;
      }
    }
  }
  return moves;
}

export function refillTop(grid: Grid, level: LevelConfig, prng: Prng): RefillAddition[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const additions: RefillAddition[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (getCell(grid, r, c) === null) {
        const type = level.wasteTypes[prng.intRange(0, level.wasteTypes.length - 1)]!;
        setCell(grid, r, c, type);
        additions.push({ to: { row: r, col: c }, type });
      }
    }
  }
  return additions;
}

export interface CascadeStep {
  matches: MatchGroup[];
  drops: DropMove[];
  refill: RefillAddition[];
  cascadeIndex: number;
}

export interface CascadeResult {
  events: CascadeStep[];
}

export function applyCascade(grid: Grid, level: LevelConfig, prng: Prng): CascadeResult {
  const events: CascadeStep[] = [];
  let cascadeIndex = 1;
  while (true) {
    const matches = findMatches(grid);
    if (matches.length === 0) break;
    for (const m of matches) {
      for (const cell of m.cells) setCell(grid, cell.row, cell.col, null);
    }
    const drops = applyGravity(grid);
    const refill = refillTop(grid, level, prng);
    events.push({ matches, drops, refill, cascadeIndex });
    cascadeIndex++;
  }
  return { events };
}
