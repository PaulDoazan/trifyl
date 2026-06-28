import { describe, it, expect } from 'vitest';
import { findMatches, isValidSwap } from './matching';
import { OBSTACLE_TYPE } from './obstacle';
import type { Grid } from './grid';

// Helpers : types niveau 1. Le matching se fait par famille (couleur).
const Y1 = 'eau', Y2 = 'canette', Y3 = 'yaourt';      // jaune
const O1 = 'banane', O2 = 'pelure_orange';            // orange
const B1 = 'couche';                                  // noir
const X = OBSTACLE_TYPE;

describe('obstacles dans le matching', () => {
  it('un obstacle ne matche jamais (3 obstacles alignés)', () => {
    const grid: Grid = [
      [X, X, X],
      [Y1, O1, B1],
      [Y2, O2, B1],
    ];
    const groups = findMatches(grid);
    expect(groups.flatMap((g) => g.cells)).toHaveLength(0);
  });

  it('un obstacle casse un alignement de couleur', () => {
    // Sans obstacle, ce serait un run jaune de 5 ; l\'obstacle le coupe.
    const grid: Grid = [[Y1, Y2, X, Y3, Y1]];
    expect(findMatches(grid)).toHaveLength(0);
  });

  it('reste correct pour les vrais matchs (run jaune de 3)', () => {
    const grid: Grid = [[Y1, Y2, Y3]];
    const groups = findMatches(grid);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.category).toBe('yellow');
    expect(groups[0]!.cells).toHaveLength(3);
  });
});

describe('isValidSwap avec obstacles', () => {
  // Grille de contrôle : échanger (0,2) et (1,2) crée un run jaune en ligne 0.
  const base: Grid = [
    [Y1, Y2, B1],
    [O1, O2, Y3],
  ];

  it('contrôle positif : un swap qui crée un combo est valide', () => {
    expect(isValidSwap(base, { row: 0, col: 2 }, { row: 1, col: 2 })).toBe(true);
  });

  it('un swap déchet↔obstacle sans combo créé est invalide', () => {
    // Déplacer B1 vers (1,2) ne crée aucun alignement → invalide (comme tout swap stérile).
    const grid: Grid = [
      [Y1, Y2, B1],
      [O1, O2, X],
    ];
    expect(isValidSwap(grid, { row: 0, col: 2 }, { row: 1, col: 2 })).toBe(false);
  });

  it('un swap déchet↔obstacle qui crée un combo est VALIDE (l\'obstacle est échangeable)', () => {
    // Échanger l\'obstacle (1,0) avec canette (1,1) aligne la colonne 0 en jaune → succès.
    const grid: Grid = [
      [Y1, O1],
      [X, Y2],
      [Y3, B1],
    ];
    expect(isValidSwap(grid, { row: 1, col: 0 }, { row: 1, col: 1 })).toBe(true);
  });

  it('échanger deux obstacles est invalide', () => {
    const grid: Grid = [
      [X, X, B1],
      [O1, O2, Y3],
    ];
    expect(isValidSwap(grid, { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });
});
