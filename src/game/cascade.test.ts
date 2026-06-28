import { describe, it, expect } from 'vitest';
import { applyCascade, refillTop } from './cascade';
import { OBSTACLE_TYPE, isObstacle } from './obstacle';
import { createPrng } from './prng';
import type { LevelConfig } from './levels';
import type { Grid } from './grid';

const Y1 = 'eau', Y2 = 'canette', Y3 = 'yaourt';
const O1 = 'banane', O2 = 'pelure_orange';
const B1 = 'couche';
const X = OBSTACLE_TYPE;

function level(obstacleRate: number, obstacleMin = 0): LevelConfig {
  return {
    level: 1,
    size: 5,
    wasteTypes: [Y1, Y2, Y3, O1, O2, B1],
    binCapacity: { yellow: 9, black: 9, orange: 9 },
    gridAsset: '',
    binVideAsset: { yellow: '', black: '', orange: '' },
    obstacleRate,
    obstacleInitial: 0,
    obstacleMin,
  };
}

function flat(grid: Grid) {
  return grid.flat();
}

describe('refillTop : injection des obstacles', () => {
  it('rate=1 → toutes les cases vides deviennent des obstacles', () => {
    const grid: Grid = [[null, null], [Y1, null]];
    refillTop(grid, level(1), createPrng(42));
    expect(grid[0]![0]).toBe(X);
    expect(grid[0]![1]).toBe(X);
    expect(grid[1]![0]).toBe(Y1); // case déjà remplie : inchangée
    expect(grid[1]![1]).toBe(X);
  });

  it('rate=0 → aucun obstacle injecté', () => {
    const grid: Grid = [[null, null, null]];
    refillTop(grid, level(0), createPrng(7));
    expect(flat(grid).some(isObstacle)).toBe(false);
    expect(flat(grid).every((c) => c !== null)).toBe(true);
  });

  it('maintient le minimum : réinjecte des obstacles si le compte est sous obstacleMin', () => {
    // 1 obstacle présent, 4 cases vides, min=4 → 3 obstacles réinjectés (total 4), rate=0.
    const grid: Grid = [[null, null, null, null], [X, Y1, Y2, Y3]];
    refillTop(grid, level(0, 4), createPrng(7));
    expect(flat(grid).filter(isObstacle)).toHaveLength(4);
  });

  it('ne réinjecte rien si le minimum est déjà atteint', () => {
    const grid: Grid = [[null, null], [X, X], [X, X]];
    refillTop(grid, level(0, 4), createPrng(7));
    // déjà 4 obstacles → aucun ajout forcé (rate=0).
    expect(flat(grid).filter(isObstacle)).toHaveLength(4);
  });
});

describe('applyCascade : éjection des obstacles par le bas', () => {
  it('éjecte un obstacle présent sur la dernière ligne (et il disparaît de la grille)', () => {
    // Ligne 0 : run jaune (match). Obstacle en bas à gauche.
    const grid: Grid = [
      [Y1, Y2, Y3],
      [O1, B1, O2],
      [X, O2, B1],
    ];
    const res = applyCascade(grid, level(0), createPrng(123));
    expect(res.events.some((e) => e.ejected.some((p) => p.row === 2 && p.col === 0))).toBe(true);
    // rate=0 → plus aucun obstacle dans la grille finale.
    expect(flat(grid).some(isObstacle)).toBe(false);
  });

  it('continue la boucle même sans match si un obstacle doit être éjecté', () => {
    // Aucun match, mais un obstacle en dernière ligne.
    const grid: Grid = [
      [Y1, O1, Y2],
      [O1, Y1, O2],
      [X, B1, Y3],
    ];
    const res = applyCascade(grid, level(0), createPrng(5));
    expect(res.events.length).toBeGreaterThan(0);
    expect(res.events[0]!.matches).toHaveLength(0);
    expect(res.events[0]!.ejected).toEqual([{ row: 2, col: 0 }]);
    expect(flat(grid).some(isObstacle)).toBe(false);
  });
});
