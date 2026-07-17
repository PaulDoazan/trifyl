import { describe, it, expect } from 'vitest';
import { buildShapeOptions, buildBurstParams } from './confetti-config';

describe('buildShapeOptions', () => {
  it('mappe les URLs en options image 32x32 sous la cle "image"', () => {
    expect(buildShapeOptions(['a.png', 'b.png'])).toEqual({
      image: [
        { src: 'a.png', width: 32, height: 32 },
        { src: 'b.png', width: 32, height: 32 },
      ],
    });
  });
});

describe('buildBurstParams', () => {
  it('a 1920px reprend les valeurs de base de la source', () => {
    const so = { image: [] };
    const p = buildBurstParams(1920, 0.1, so);
    expect(p.origin).toEqual({ x: 0.1, y: 0.2 });
    expect(p.spread).toBe(270);
    expect(p.ticks).toBe(200);
    expect(p.gravity).toBe(1);
    expect(p.decay).toBeCloseTo(0.94);
    expect(p.startVelocity).toBe(20);
    expect(p.particleCount).toBe(30);
    expect(p.scalar).toBe(4);
    expect(p.shapes).toEqual(['image']);
    expect(p.shapeOptions).toBe(so);
  });

  it('met a l\'echelle par innerWidth/1920', () => {
    const p = buildBurstParams(960, 0.9, { image: [] });
    expect(p.origin.x).toBe(0.9);
    expect(p.spread).toBe(135);
    expect(p.scalar).toBe(2);
    expect(p.gravity).toBe(0.5);
    expect(p.startVelocity).toBe(10);
    expect(p.decay).toBeCloseTo(0.935);
  });
});
