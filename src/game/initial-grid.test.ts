import { describe, it, expect } from 'vitest';
import { createInitialGrid } from './initial-grid';
import { findMatches, findValidMoves } from './matching';
import { isObstacle } from './obstacle';
import { createPrng } from './prng';
import type { LevelConfig } from './levels';

function level(obstacleInitial: number): LevelConfig {
  return {
    level: 1,
    size: 5,
    wasteTypes: ['eau', 'canette', 'yaourt', 'banane', 'pelure_orange', 'couche'],
    binCapacity: { yellow: 9, black: 9, orange: 9 },
    gridAsset: '',
    binVideAsset: { yellow: '', black: '', orange: '' },
    obstacleRate: 0,
    obstacleInitial,
    obstacleMin: 0,
  };
}

describe('createInitialGrid avec obstacles', () => {
  it('place exactement obstacleInitial obstacles, aucun en dernière ligne', () => {
    const cfg = level(4);
    for (let seed = 1; seed <= 20; seed++) {
      const grid = createInitialGrid(cfg, createPrng(seed * 777));
      const obstacles = grid.flat().filter(isObstacle);
      expect(obstacles).toHaveLength(4);
      const lastRow = grid[cfg.size - 1]!;
      expect(lastRow.some(isObstacle)).toBe(false);
      // Invariants conservés : aucun combo de départ, au moins un coup valide.
      expect(findMatches(grid)).toHaveLength(0);
      expect(findValidMoves(grid).length).toBeGreaterThan(0);
    }
  });

  it('obstacleInitial=0 → aucun obstacle (comportement inchangé)', () => {
    const grid = createInitialGrid(level(0), createPrng(123));
    expect(grid.flat().some(isObstacle)).toBe(false);
    expect(findValidMoves(grid).length).toBeGreaterThan(0);
  });
});
