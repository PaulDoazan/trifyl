import { describe, it, expect } from 'vitest';
import { createGameState, applySwap, isLevelComplete } from '@/game/GameState';
import { getLevelConfig } from '@/game/levels';
import { createPrng } from '@/game/prng';

describe('bin fill mechanic', () => {
  it('nouvel état : compteurs poubelles à 0, niveau non terminé', () => {
    const s = createGameState(getLevelConfig(1), createPrng(1));
    expect(s.bins).toEqual({ yellow: 0, black: 0, orange: 0 });
    expect(isLevelComplete(s)).toBe(false);
  });

  it('isLevelComplete vrai quand les 3 poubelles atteignent leur capacité', () => {
    const cfg = getLevelConfig(1);
    const s = createGameState(cfg, createPrng(1));
    s.bins = { ...cfg.binCapacity };
    expect(isLevelComplete(s)).toBe(true);
  });

  it('isLevelComplete faux si une poubelle est sous capacité', () => {
    const cfg = getLevelConfig(1);
    const s = createGameState(cfg, createPrng(1));
    s.bins = { ...cfg.binCapacity, orange: cfg.binCapacity.orange - 1 };
    expect(isLevelComplete(s)).toBe(false);
  });

  it('applySwap ne renvoie plus de score, renvoie des events', () => {
    const s = createGameState(getLevelConfig(1), createPrng(42));
    const r = applySwap(s, { row: 0, col: 0 }, { row: 0, col: 1 }, createPrng(42));
    expect(r).toHaveProperty('kind');
    expect(r).not.toHaveProperty('scoreDelta');
  });
});
