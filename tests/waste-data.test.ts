import { describe, it, expect } from 'vitest';
import { ALL_WASTE_TYPES, WASTE_META } from '@/game/waste-data';

describe('waste-data', () => {
  it('every WasteType has metadata', () => {
    for (const t of ALL_WASTE_TYPES) {
      const meta = WASTE_META[t];
      expect(meta, `missing meta for ${t}`).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.asset.length).toBeGreaterThan(0);
    }
  });

  it('hazardous wastes have educationalText, others do not', () => {
    for (const t of ALL_WASTE_TYPES) {
      const meta = WASTE_META[t];
      if (meta.bin === 'hazardous') {
        expect(meta.educationalText).toBeDefined();
        expect(meta.educationalText!.length).toBeGreaterThan(0);
      } else {
        expect(meta.educationalText).toBeUndefined();
      }
    }
  });

  it('mapping is consistent: yellow=recyclables, black=residual, orange=biodéchets, hazardous=déchèterie', () => {
    expect(WASTE_META.plastic_bottle.bin).toBe('yellow');
    expect(WASTE_META.tissue.bin).toBe('black');
    expect(WASTE_META.apple.bin).toBe('orange');
    expect(WASTE_META.battery.bin).toBe('hazardous');
  });
});
