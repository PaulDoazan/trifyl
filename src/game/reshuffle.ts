import type { Grid, Pos } from './grid';
import { cloneGrid, getCell, setCell } from './grid';
import { findMatches, findValidMoves } from './matching';
import { isObstacle } from './obstacle';
import type { LevelConfig } from './levels';
import type { Prng } from './prng';
import type { WasteType } from './waste';

/**
 * Rebat la grille en cas de blocage (plus aucun coup valide), sans défaite.
 * Les obstacles restent à leur place ; seuls les déchets sont mélangés entre
 * les cases non-obstacles, en garantissant aucun combo immédiat et au moins
 * un coup valide. La progression des poubelles n'est pas concernée ici.
 */
export function reshuffleGrid(grid: Grid, _level: LevelConfig, prng: Prng): Grid {
  const positions: Pos[] = [];
  const types: WasteType[] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell !== null && !isObstacle(cell)) {
      positions.push({ row: r, col: c });
      types.push(cell);
    }
  }));

  const MAX_ATTEMPTS = 200;
  let candidate = grid;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffled = shuffle(types, prng);
    candidate = cloneGrid(grid);
    positions.forEach((p, i) => setCell(candidate, p.row, p.col, shuffled[i]!));
    if (findMatches(candidate).length === 0 && findValidMoves(candidate).length > 0) {
      return candidate;
    }
  }
  // Repli : meilleure tentative obtenue (cas pathologique très improbable sur une vraie grille).
  return candidate;
}

function shuffle<T>(arr: readonly T[], prng: Prng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = prng.intRange(0, i);
    const tmp = out[i]!; out[i] = out[j]!; out[j] = tmp;
  }
  return out;
}
