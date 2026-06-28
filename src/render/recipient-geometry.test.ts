import { describe, it, expect } from 'vitest';
import { computeCapGeometry, CAP_CONFIG } from './recipient-geometry';

describe('computeCapGeometry', () => {
  it('lid: hauteur de coiffe = capFrac * binH et pivot arrière (origin en bas)', () => {
    const g = computeCapGeometry(200, 250, CAP_CONFIG.yellow);
    expect(g.capHeightPx).toBeCloseTo(250 * CAP_CONFIG.yellow.capFrac, 3);
    expect(g.lid).toBeDefined();
    expect(g.lid!.originPct).toBe('50% 100%'); // charnière = arête basse de la bande
    expect(g.lid!.openTransform).toContain(`rotateX(${CAP_CONFIG.yellow.openAngleDeg}deg)`);
    expect(g.flaps).toBeUndefined();
  });

  it('flaps: deux pans symétriques pivotant vers l’extérieur', () => {
    const g = computeCapGeometry(200, 250, CAP_CONFIG.black);
    expect(g.flaps).toBeDefined();
    const a = CAP_CONFIG.black.openAngleDeg;
    expect(g.flaps!.left.originPct).toBe('100% 100%'); // charnière interne (centre-bas)
    expect(g.flaps!.right.originPct).toBe('0% 100%');
    expect(g.flaps!.left.openTransform).toContain(`rotate(-${a}deg)`);
    expect(g.flaps!.right.openTransform).toContain(`rotate(${a}deg)`);
    expect(g.lid).toBeUndefined();
  });

  it('bouche dimensionnée sous la coiffe', () => {
    const g = computeCapGeometry(200, 250, CAP_CONFIG.orange);
    expect(g.mouth.heightPx).toBeGreaterThan(0);
    expect(g.mouth.bottomPx).toBeGreaterThanOrEqual(0);
  });
});
