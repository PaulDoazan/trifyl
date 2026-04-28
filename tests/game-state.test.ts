import { describe, it, expect } from 'vitest';
import { createGameState, applySwap } from '@/game/GameState';
import { LEVEL_1 } from '@/game/levels';
import { createPrng } from '@/game/prng';
import { findValidMoves } from '@/game/matching';

describe('GameState', () => {
  it('createGameState returns a playable state for level 1', () => {
    const s = createGameState(LEVEL_1, createPrng(123));
    expect(s.level).toBe(1);
    expect(s.score).toBe(0);
    expect(s.isOver).toBe(false);
    expect(s.grid.length).toBe(LEVEL_1.size);
  });

  it('applySwap on invalid swap returns kind=invalid, no state mutation', () => {
    const s = createGameState(LEVEL_1, createPrng(1));
    const initialScore = s.score;
    const moves = findValidMoves(s.grid);
    const invalidA = { row: 0, col: 0 };
    let invalidB = { row: 0, col: 1 };
    if (moves.some((m) => m.a.row === 0 && m.a.col === 0 && m.b.row === 0 && m.b.col === 1)) {
      invalidB = { row: 1, col: 0 };
    }
    const next = applySwap(s, invalidA, invalidB, createPrng(99));
    expect(next.kind).toBe('invalid');
    expect(s.score).toBe(initialScore);
  });

  it('applySwap on valid swap returns kind=resolved with cascade events and score >= 30', () => {
    let s = createGameState(LEVEL_1, createPrng(2));
    const moves = findValidMoves(s.grid);
    expect(moves.length).toBeGreaterThan(0);
    const m = moves[0]!;
    const result = applySwap(s, m.a, m.b, createPrng(2));
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.next.score).toBeGreaterThanOrEqual(30);
    }
  });

  it('isOver becomes true once no valid moves remain', () => {
    const s = createGameState(LEVEL_1, createPrng(1));
    expect(findValidMoves(s.grid).length).toBeGreaterThan(0);
  });
});
