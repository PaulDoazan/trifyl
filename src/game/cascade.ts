import type { Grid, Pos } from './grid';
import { getCell, setCell } from './grid';
import { findMatches, type MatchGroup } from './matching';
import type { LevelConfig } from './levels';
import type { Prng } from './prng';
import type { WasteType } from './waste';
import { OBSTACLE_TYPE, isObstacle } from './obstacle';

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
  // Plancher d'obstacles : on réinjecte par le haut de quoi atteindre obstacleMin.
  let deficit = Math.max(0, level.obstacleMin - countObstacles(grid));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (getCell(grid, r, c) === null) {
        let type: WasteType;
        if (deficit > 0) {
          type = OBSTACLE_TYPE;
          deficit--;
        } else {
          type = prng.next() < level.obstacleRate
            ? OBSTACLE_TYPE
            : level.wasteTypes[prng.intRange(0, level.wasteTypes.length - 1)]!;
        }
        setCell(grid, r, c, type);
        additions.push({ to: { row: r, col: c }, type });
      }
    }
  }
  return additions;
}

function countObstacles(grid: Grid): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (isObstacle(cell)) n++;
  return n;
}

/** Positions des obstacles présents sur la dernière ligne (à éjecter hors grille). */
function bottomObstacles(grid: Grid): Pos[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0) return [];
  const out: Pos[] = [];
  const r = rows - 1;
  for (let c = 0; c < cols; c++) {
    if (isObstacle(getCell(grid, r, c))) out.push({ row: r, col: c });
  }
  return out;
}

export interface CascadeStep {
  matches: MatchGroup[];
  /** Obstacles éjectés par le bas durant cette étape (avant gravité/refill). */
  ejected: Pos[];
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
    const ejected = bottomObstacles(grid);
    if (matches.length === 0 && ejected.length === 0) break;
    for (const m of matches) {
      for (const cell of m.cells) setCell(grid, cell.row, cell.col, null);
    }
    for (const p of ejected) setCell(grid, p.row, p.col, null);
    const drops = applyGravity(grid);
    const refill = refillTop(grid, level, prng);
    events.push({ matches, ejected, drops, refill, cascadeIndex });
    cascadeIndex++;
  }
  return { events };
}
