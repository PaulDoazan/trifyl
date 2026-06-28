import { describe, it, expect } from 'vitest';
import { resolveAxis, neighborOf, clampOffset, shouldCommit } from './dragMath';

describe('resolveAxis', () => {
  it('returns null while both axes stay under lockPx', () => {
    expect(resolveAxis(3, -4, 6)).toBeNull();
  });
  it('locks to x when horizontal movement dominates', () => {
    expect(resolveAxis(20, 5, 6)).toBe('x');
  });
  it('locks to y when vertical movement dominates', () => {
    expect(resolveAxis(4, -20, 6)).toBe('y');
  });
  it('prefers x on a tie', () => {
    expect(resolveAxis(10, 10, 6)).toBe('x');
  });
});

describe('neighborOf', () => {
  const cell = { row: 3, col: 3 };
  it('returns the right cell when dragging x positive', () => {
    expect(neighborOf(cell, 'x', 12)).toEqual({ row: 3, col: 4 });
  });
  it('returns the left cell when dragging x negative', () => {
    expect(neighborOf(cell, 'x', -12)).toEqual({ row: 3, col: 2 });
  });
  it('returns the cell below when dragging y positive', () => {
    expect(neighborOf(cell, 'y', 12)).toEqual({ row: 4, col: 3 });
  });
  it('returns null when delta is zero', () => {
    expect(neighborOf(cell, 'x', 0)).toBeNull();
  });
});

describe('clampOffset', () => {
  it('keeps an offset within one tile', () => {
    expect(clampOffset(40, 100)).toBe(40);
  });
  it('clamps a positive offset to +tile', () => {
    expect(clampOffset(180, 100)).toBe(100);
  });
  it('clamps a negative offset to -tile', () => {
    expect(clampOffset(-180, 100)).toBe(-100);
  });
});

describe('shouldCommit', () => {
  it('commits past half a tile', () => {
    expect(shouldCommit(60, 100, 0.5)).toBe(true);
  });
  it('does not commit below half a tile', () => {
    expect(shouldCommit(40, 100, 0.5)).toBe(false);
  });
  it('does not commit exactly at half (strict)', () => {
    expect(shouldCommit(50, 100, 0.5)).toBe(false);
  });
});
