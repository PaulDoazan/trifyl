import { describe, it, expect } from 'vitest';
import { createPrng } from '@/game/prng';

describe('createPrng', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const r = createPrng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('intRange is uniform over [min, max]', () => {
    const r = createPrng(1);
    const counts = new Map<number, number>();
    for (let i = 0; i < 6000; i++) {
      const v = r.intRange(0, 5);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (let v = 0; v <= 5; v++) {
      const c = counts.get(v) ?? 0;
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });

  it('pick selects from array', () => {
    const r = createPrng(3);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(r.pick(arr));
    }
  });
});
