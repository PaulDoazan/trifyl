import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid, cloneGrid, inBounds, areAdjacent, swapCells, getCell, setCell,
} from '@/game/grid';

describe('grid', () => {
  it('createEmptyGrid yields rows×cols of nulls', () => {
    const g = createEmptyGrid(3, 4);
    expect(g.length).toBe(3);
    expect(g[0]!.length).toBe(4);
    for (const row of g) for (const c of row) expect(c).toBeNull();
  });

  it('inBounds covers edges and rejects outside', () => {
    expect(inBounds({ rows: 5, cols: 5 }, 0, 0)).toBe(true);
    expect(inBounds({ rows: 5, cols: 5 }, 4, 4)).toBe(true);
    expect(inBounds({ rows: 5, cols: 5 }, -1, 0)).toBe(false);
    expect(inBounds({ rows: 5, cols: 5 }, 5, 0)).toBe(false);
    expect(inBounds({ rows: 5, cols: 5 }, 0, 5)).toBe(false);
  });

  it('areAdjacent: only orthogonal direct neighbours', () => {
    expect(areAdjacent({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 0, col: 1 })).toBe(true);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(false);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(false);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 1, col: 3 })).toBe(false);
  });

  it('swapCells swaps in place and is reversible', () => {
    const g = createEmptyGrid(2, 2);
    setCell(g, 0, 0, 'apple');
    setCell(g, 0, 1, 'tissue');
    swapCells(g, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(getCell(g, 0, 0)).toBe('tissue');
    expect(getCell(g, 0, 1)).toBe('apple');
    swapCells(g, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(getCell(g, 0, 0)).toBe('apple');
  });

  it('cloneGrid is a deep copy', () => {
    const g = createEmptyGrid(2, 2);
    setCell(g, 0, 0, 'apple');
    const c = cloneGrid(g);
    setCell(c, 0, 0, 'tissue');
    expect(getCell(g, 0, 0)).toBe('apple');
    expect(getCell(c, 0, 0)).toBe('tissue');
  });
});
