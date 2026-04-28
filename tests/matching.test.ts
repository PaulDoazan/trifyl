import { describe, it, expect } from 'vitest';
import { findMatches, isValidSwap, findValidMoves } from '@/game/matching';
import type { Grid } from '@/game/grid';
import type { WasteType } from '@/game/waste';

const A: WasteType = 'apple';
const B: WasteType = 'tissue';
const C: WasteType = 'plastic_bottle';

const g = (rows: (WasteType | null)[][]): Grid => rows.map((r) => r.slice());

describe('findMatches', () => {
  it('returns empty when no match', () => {
    const board = g([
      [A, B, A],
      [B, A, B],
      [A, B, A],
    ]);
    expect(findMatches(board)).toEqual([]);
  });

  it('detects horizontal 3-match', () => {
    const board = g([
      [A, A, A],
      [B, C, B],
      [C, B, C],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    expect(m[0]!.type).toBe(A);
    expect(m[0]!.cells.length).toBe(3);
  });

  it('detects vertical 4-match', () => {
    const board = g([
      [A, B, C],
      [A, C, B],
      [A, B, C],
      [A, C, B],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    expect(m[0]!.cells.length).toBe(4);
  });

  it('merges overlapping horizontal+vertical (T/L cross)', () => {
    const board = g([
      [B, A, B],
      [B, A, B],
      [A, A, A],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    const cells = m[0]!.cells;
    expect(cells.length).toBe(5);
  });
});

describe('isValidSwap', () => {
  it('false if not adjacent', () => {
    const board = g([
      [A, A, B],
      [B, B, A],
      [A, A, B],
    ]);
    expect(isValidSwap(board, { row: 0, col: 0 }, { row: 2, col: 2 })).toBe(false);
  });

  it('false if swap creates no match', () => {
    const board = g([
      [A, B, A],
      [B, A, B],
      [A, B, A],
    ]);
    expect(isValidSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });

  it('true if swap creates a match', () => {
    const board = g([
      [A, B, A],
      [A, A, B],
      [B, A, B],
    ]);
    expect(isValidSwap(board, { row: 0, col: 1 }, { row: 1, col: 1 })).toBe(true);
  });
});

describe('findValidMoves', () => {
  it('returns empty when no swap creates any match', () => {
    // 1×3 with 2 distinct types: only adjacent swaps are (0,0)↔(0,1) and (0,1)↔(0,2);
    // neither produces a 3-in-a-row in a 3-cell row, so no moves exist.
    const board = g([[A, B, A]]);
    expect(findValidMoves(board)).toEqual([]);
  });

  it('returns at least one move when one exists', () => {
    const board = g([
      [A, B, A],
      [A, A, B],
      [B, A, B],
    ]);
    const moves = findValidMoves(board);
    expect(moves.length).toBeGreaterThan(0);
  });
});
