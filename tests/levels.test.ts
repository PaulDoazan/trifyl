import { describe, it, expect } from 'vitest';
import { getLevelConfig } from '@/game/levels';

describe('level configs', () => {
  it('tailles de grille 5/8/10', () => {
    expect(getLevelConfig(1).size).toBe(5);
    expect(getLevelConfig(2).size).toBe(7);
    expect(getLevelConfig(3).size).toBe(10);
  });

  it('au moins 4 types par niveau', () => {
    for (const l of [1, 2, 3] as const) {
      expect(getLevelConfig(l).wasteTypes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('capacité définie pour les 3 poubelles', () => {
    for (const l of [1, 2, 3] as const) {
      const cfg = getLevelConfig(l);
      expect(cfg.binCapacity.yellow).toBeGreaterThan(0);
      expect(cfg.binCapacity.black).toBeGreaterThan(0);
      expect(cfg.binCapacity.orange).toBeGreaterThan(0);
    }
  });
});
