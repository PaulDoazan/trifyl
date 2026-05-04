import { describe, it, expect } from 'vitest';
import { LEVEL_1, LEVEL_2, LEVEL_3, getLevelConfig } from '@/game/levels';
import { WASTE_META } from '@/game/waste-data';

describe('level configs', () => {
  it('grid sizes per spec', () => {
    expect(LEVEL_1.size).toBe(5);
    expect(LEVEL_2.size).toBe(10);
    expect(LEVEL_3.size).toBe(15);
  });

  it('every trapType is included in wasteTypes', () => {
    for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
      for (const t of lvl.trapTypes) {
        expect(lvl.wasteTypes).toContain(t);
      }
    }
  });

  it('every trapType is hazardous in WASTE_META', () => {
    for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
      for (const t of lvl.trapTypes) {
        expect(WASTE_META[t].bin).toBe('hazardous');
      }
    }
  });

  it('every level has at least 4 waste types (so matches stay possible after shuffle)', () => {
    for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
      expect(lvl.wasteTypes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('getLevelConfig returns correct config', () => {
    expect(getLevelConfig(1)).toBe(LEVEL_1);
    expect(getLevelConfig(2)).toBe(LEVEL_2);
    expect(getLevelConfig(3)).toBe(LEVEL_3);
  });
});
