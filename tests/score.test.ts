import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '@/game/score';

describe('computeMatchScore', () => {
  it('match-3 base = 30', () => {
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 1 })).toBe(30);
  });
  it('match-4 base = 60, match-5 = 100, match-6+ = 150', () => {
    expect(computeMatchScore({ size: 4, hasTrap: false, cascadeIndex: 1 })).toBe(60);
    expect(computeMatchScore({ size: 5, hasTrap: false, cascadeIndex: 1 })).toBe(100);
    expect(computeMatchScore({ size: 6, hasTrap: false, cascadeIndex: 1 })).toBe(150);
    expect(computeMatchScore({ size: 8, hasTrap: false, cascadeIndex: 1 })).toBe(150);
  });
  it('trap doubles', () => {
    expect(computeMatchScore({ size: 3, hasTrap: true, cascadeIndex: 1 })).toBe(60);
  });
  it('cascade index multiplies', () => {
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 2 })).toBe(60);
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 3 })).toBe(90);
  });
  it('cascade caps at ×5', () => {
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 5 })).toBe(150);
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 99 })).toBe(150);
  });
  it('trap and cascade compound', () => {
    expect(computeMatchScore({ size: 3, hasTrap: true, cascadeIndex: 3 })).toBe(180);
  });
});
