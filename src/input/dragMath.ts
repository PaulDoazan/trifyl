import type { Pos } from '@/game/grid';

export type Axis = 'x' | 'y';

/** Axe dominant une fois le mouvement au-delà de lockPx ; null tant que c'est un quasi-appui. */
export function resolveAxis(dx: number, dy: number, lockPx: number): Axis | null {
  if (Math.abs(dx) < lockPx && Math.abs(dy) < lockPx) return null;
  return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
}

/** Case voisine candidate dans la direction du drag (signe de delta) ; null si delta nul. */
export function neighborOf(cell: Pos, axis: Axis, delta: number): Pos | null {
  const dir = Math.sign(delta);
  if (dir === 0) return null;
  return axis === 'x'
    ? { row: cell.row, col: cell.col + dir }
    : { row: cell.row + dir, col: cell.col };
}

/** Décalage signé borné à ±tile (suivi limité à une case). */
export function clampOffset(delta: number, tile: number): number {
  return Math.max(-tile, Math.min(tile, delta));
}

/** Vrai si le déchet a été tiré au-delà de commitRatio d'une case. */
export function shouldCommit(offset: number, tile: number, commitRatio: number): boolean {
  return Math.abs(offset) / tile > commitRatio;
}
