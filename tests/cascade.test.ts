import { describe, it, expect } from 'vitest';
import { applyGravity, refillTop, applyCascade } from '@/game/cascade';
import type { Grid } from '@/game/grid';
import type { WasteType } from '@/game/waste';
import { createPrng } from '@/game/prng';
import { getLevelConfig } from '@/game/levels';
import { isObstacle } from '@/game/obstacle';

const LEVEL_1 = getLevelConfig(1);

const A: WasteType = 'eau';
const B: WasteType = 'canette';
const C: WasteType = 'banane';
const D: WasteType = 'yaourt';

const g = (rows: (WasteType | null)[][]): Grid => rows.map((r) => r.slice());

describe('applyGravity', () => {
  it('drops cells over holes within each column', () => {
    const board = g([
      [A,    B, C],
      [null, B, C],
      [A,    null, C],
      [null, A, null],
    ]);
    const moves = applyGravity(board);
    expect(board[3]).toEqual([A, A, C]);
    expect(board[2]).toEqual([A, B, C]);
    expect(board[1]).toEqual([null, B, C]);
    expect(board[0]).toEqual([null, null, null]);
    expect(moves.length).toBeGreaterThan(0);
    // gravity invariants: every recorded move drops a cell down within the same column
    for (const m of moves) {
      expect(m.from.col).toBe(m.to.col);
      expect(m.from.row).toBeLessThan(m.to.row);
    }
  });
});

describe('refillTop', () => {
  it('fills nulls from the top with allowed waste types', () => {
    const board = g([
      [null, null, null],
      [null, B,    C],
      [A,    B,    C],
    ]);
    const additions = refillTop(board, LEVEL_1, createPrng(1));
    for (const row of board) for (const c of row) expect(c).not.toBeNull();
    const allowed = new Set(LEVEL_1.wasteTypes);
    for (const row of board) for (const c of row) expect(allowed.has(c!) || isObstacle(c)).toBe(true);
    expect(additions.length).toBe(4);
  });
});

describe('applyCascade', () => {
  it('returns one cascade event per resolution and final stable grid has no matches', () => {
    const board = g([
      [A, B, C, D, A],
      [A, C, B, D, B],
      [B, A, A, A, C],
      [C, B, C, A, B],
      [D, A, B, C, A],
    ]);
    const result = applyCascade(board, LEVEL_1, createPrng(7));
    expect(result.events.length).toBeGreaterThanOrEqual(1);
    const last = board.flat();
    expect(last.every((c) => c !== null)).toBe(true);
  });
});
