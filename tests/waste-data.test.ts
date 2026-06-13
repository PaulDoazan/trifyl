import { describe, it, expect } from 'vitest';
import { ALL_WASTE_TYPES, WASTE_META } from '@/game/waste-data';
import { isSpecialCategory } from '@/game/config-loader';

describe('waste-data', () => {
  it('chaque type a des métadonnées avec asset', () => {
    for (const t of ALL_WASTE_TYPES) {
      const m = WASTE_META[t];
      expect(m, `missing meta for ${t}`).toBeDefined();
      expect(m!.asset.length).toBeGreaterThan(0);
    }
  });

  it('catégories connues', () => {
    for (const t of ALL_WASTE_TYPES) {
      expect(['yellow', 'black', 'orange', 'piles', 'textile', 'verre']).toContain(WASTE_META[t]!.category);
    }
  });

  it('mapping de référence', () => {
    expect(WASTE_META.eau!.category).toBe('yellow');
    expect(WASTE_META.banane!.category).toBe('orange');
    expect(WASTE_META.yaourt!.category).toBe('black');
    expect(isSpecialCategory(WASTE_META.pile!.category)).toBe(true);
  });
});
