import { describe, it, expect } from 'vitest';
import { reshuffleGrid } from './reshuffle';
import { createInitialGrid } from './initial-grid';
import { findMatches, findValidMoves } from './matching';
import { isObstacle } from './obstacle';
import { createPrng } from './prng';
import type { LevelConfig } from './levels';
import type { Grid } from './grid';

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

function obstaclePositions(grid: Grid): string[] {
  const out: string[] = [];
  grid.forEach((row, r) => row.forEach((c, col) => { if (isObstacle(c)) out.push(`${r},${col}`); }));
  return out.sort();
}

function wasteMultiset(grid: Grid): string[] {
  return grid.flat().filter((c) => c !== null && !isObstacle(c)).sort() as string[];
}

describe('reshuffleGrid', () => {
  it('produit une grille sans combo immédiat et avec au moins un coup valide', () => {
    const cfg = level(4);
    for (let seed = 1; seed <= 15; seed++) {
      const grid = createInitialGrid(cfg, createPrng(seed * 31));
      const out = reshuffleGrid(grid, cfg, createPrng(seed * 13));
      expect(findMatches(out)).toHaveLength(0);
      expect(findValidMoves(out).length).toBeGreaterThan(0);
    }
  });

  it('conserve les obstacles à leur place et le multiset des déchets', () => {
    const cfg = level(4);
    const grid = createInitialGrid(cfg, createPrng(99));
    const out = reshuffleGrid(grid, cfg, createPrng(101));
    expect(obstaclePositions(out)).toEqual(obstaclePositions(grid));
    expect(wasteMultiset(out)).toEqual(wasteMultiset(grid));
  });
});
