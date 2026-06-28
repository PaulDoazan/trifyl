import { describe, it, expect } from 'vitest';
import { GAME_CONFIG, BIN_CATEGORIES, isSpecialCategory } from '@/game/config-loader';

describe('config-loader', () => {
  it('expose 3 niveaux avec tailles 5/7/10', () => {
    expect(GAME_CONFIG.levels.map((l) => l.size)).toEqual([5, 7, 10]);
  });

  it('chaque niveau a une capacité pour les 3 poubelles', () => {
    for (const lvl of GAME_CONFIG.levels) {
      for (const bin of BIN_CATEGORIES) {
        expect(lvl.binCapacity[bin]).toBeGreaterThan(0);
      }
    }
  });

  it('chaque niveau a au moins une catégorie poubelle de chaque type', () => {
    for (const lvl of GAME_CONFIG.levels) {
      for (const bin of BIN_CATEGORIES) {
        const hasBin = lvl.wastes.some((w) => w.category === bin);
        expect(hasBin, `niveau ${lvl.level} sans déchet ${bin}`).toBe(true);
      }
    }
  });

  it('chaque niveau a >= 4 types de déchets', () => {
    for (const lvl of GAME_CONFIG.levels) {
      expect(lvl.wastes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('isSpecialCategory distingue poubelles et spéciaux', () => {
    expect(isSpecialCategory('yellow')).toBe(false);
    expect(isSpecialCategory('piles')).toBe(true);
    expect(isSpecialCategory('verre')).toBe(true);
  });

  it('timings cohérents', () => {
    expect(GAME_CONFIG.timings.idleReturnToHomeMs).toBe(300000);
    expect(GAME_CONFIG.timings.eduOverlayMs).toBeGreaterThan(0);
  });
});
