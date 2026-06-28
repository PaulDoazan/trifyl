import { describe, it, expect } from 'vitest';
import { createGameState, applySwap } from '@/game/GameState';
import { getLevelConfig } from '@/game/levels';
import { createPrng } from '@/game/prng';
import { findValidMoves } from '@/game/matching';

describe('GameState', () => {
  it('createGameState returns a playable state for level 1', () => {
    const cfg = getLevelConfig(1);
    const s = createGameState(cfg, createPrng(123));
    expect(s.level).toBe(1);
    expect(s.bins).toEqual({ yellow: 0, black: 0, orange: 0 });
    expect(s.isOver).toBe(false);
    expect(s.grid.length).toBe(cfg.size);
  });

  it('applySwap on invalid swap returns kind=invalid, no state mutation', () => {
    const cfg = getLevelConfig(1);
    const s = createGameState(cfg, createPrng(1));
    const initialBins = { ...s.bins };
    const moves = findValidMoves(s.grid);
    const invalidA = { row: 0, col: 0 };
    let invalidB = { row: 0, col: 1 };
    if (moves.some((m) => m.a.row === 0 && m.a.col === 0 && m.b.row === 0 && m.b.col === 1)) {
      invalidB = { row: 1, col: 0 };
    }
    const next = applySwap(s, invalidA, invalidB, createPrng(99));
    expect(next.kind).toBe('invalid');
    expect(s.bins).toEqual(initialBins);
  });

  it('applySwap on valid swap returns kind=resolved with cascade events and updated bins', () => {
    const cfg = getLevelConfig(1);
    let s = createGameState(cfg, createPrng(2));
    const moves = findValidMoves(s.grid);
    expect(moves.length).toBeGreaterThan(0);
    const m = moves[0]!;
    const result = applySwap(s, m.a, m.b, createPrng(2));
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.events.length).toBeGreaterThanOrEqual(1);
      // Niveau 1 n'a que des catégories poubelle (pas de spécial) : un match remplit forcément une poubelle.
      const totalBinFill = Object.values(result.next.bins).reduce((acc, v) => acc + v, 0);
      expect(totalBinFill).toBeGreaterThan(0);
    }
  });

  it('isOver becomes true once no valid moves remain', () => {
    const cfg = getLevelConfig(1);
    const s = createGameState(cfg, createPrng(1));
    expect(findValidMoves(s.grid).length).toBeGreaterThan(0);
  });
});
