import { describe, it, expect } from 'vitest';
import { createInitialGrid } from '@/game/initial-grid';
import { findMatches, findValidMoves } from '@/game/matching';
import { getLevelConfig } from '@/game/levels';

const LEVEL_1 = getLevelConfig(1);
const LEVEL_2 = getLevelConfig(2);
const LEVEL_3 = getLevelConfig(3);
import { createPrng } from '@/game/prng';

describe('createInitialGrid', () => {
  for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
    it(`level ${lvl.level}: no initial match, at least one valid move (10 seeds)`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const grid = createInitialGrid(lvl, createPrng(seed));
        expect(grid.length).toBe(lvl.size);
        expect(grid[0]!.length).toBe(lvl.size);
        expect(findMatches(grid)).toEqual([]);
        expect(findValidMoves(grid).length).toBeGreaterThan(0);
      }
    });

    it(`level ${lvl.level}: only uses configured wasteTypes`, () => {
      const grid = createInitialGrid(lvl, createPrng(42));
      const allowed = new Set(lvl.wasteTypes);
      for (const row of grid) for (const c of row) {
        expect(c).not.toBeNull();
        expect(allowed.has(c!)).toBe(true);
      }
    });
  }
});
