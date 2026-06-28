import { describe, it, expect } from 'vitest';
import { findMatches, isValidSwap, findValidMoves } from '@/game/matching';
import type { Grid } from '@/game/grid';
import type { WasteType } from '@/game/waste';

// Le matching se fait par FAMILLE (catégorie/couleur), pas par type exact.
// Types réels du niveau 1 : eau & canette = jaune ; banane = orange ; yaourt = noir.
const Y: WasteType = 'eau';      // jaune
const Y2: WasteType = 'canette'; // jaune (autre item, même famille)
const O: WasteType = 'banane';   // orange
const K: WasteType = 'yaourt';   // noir

const g = (rows: (WasteType | null)[][]): Grid => rows.map((r) => r.slice());

describe('findMatches (par famille)', () => {
  it('aucun combo en damier de 2 familles', () => {
    const board = g([
      [Y, O, Y],
      [O, Y, O],
      [Y, O, Y],
    ]);
    expect(findMatches(board)).toEqual([]);
  });

  it('combo horizontal de 3 items de même famille (types différents)', () => {
    const board = g([
      [Y, Y2, Y],
      [O, K, O],
      [K, O, K],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    expect(m[0]!.category).toBe('yellow');
    expect(m[0]!.cells.length).toBe(3);
  });

  it('combo vertical de 4 (même famille, types mélangés)', () => {
    const board = g([
      [Y, O, K],
      [Y2, K, O],
      [Y, O, K],
      [Y2, K, O],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    expect(m[0]!.category).toBe('yellow');
    expect(m[0]!.cells.length).toBe(4);
  });

  it('fusionne un croisement T/L de même famille', () => {
    const board = g([
      [O, Y, O],
      [O, Y2, O],
      [Y, Y2, Y],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    expect(m[0]!.cells.length).toBe(5);
  });
});

describe('isValidSwap (par famille)', () => {
  it('faux si non adjacent', () => {
    const board = g([
      [Y, O, Y],
      [O, Y, O],
      [Y, O, Y],
    ]);
    expect(isValidSwap(board, { row: 0, col: 0 }, { row: 2, col: 2 })).toBe(false);
  });

  it('faux si le swap ne crée aucun combo', () => {
    const board = g([
      [Y, O, Y],
      [O, Y, O],
      [Y, O, Y],
    ]);
    expect(isValidSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });

  it('vrai si le swap aligne 3 items de même famille', () => {
    const board = g([
      [Y, O, Y],
      [O, Y, Y],
      [Y, O, K],
    ]);
    // échanger (0,1)=orange et (1,1)=jaune rend la ligne 0 entièrement jaune.
    expect(isValidSwap(board, { row: 0, col: 1 }, { row: 1, col: 1 })).toBe(true);
  });
});

describe('findValidMoves (par famille)', () => {
  it('vide si aucun swap ne crée de combo', () => {
    const board = g([[Y, O, Y]]);
    expect(findValidMoves(board)).toEqual([]);
  });

  it('au moins un coup quand il en existe un', () => {
    const board = g([
      [Y, O, Y],
      [O, Y, Y],
      [Y, O, K],
    ]);
    expect(findValidMoves(board).length).toBeGreaterThan(0);
  });
});
