import type { Cell } from './grid';

/**
 * Tuile obstacle : une valeur de cellule distincte, non-`null` (donc soumise à la
 * gravité), mais absente de WASTE_META. Comme `catOf` fait `WASTE_META[cell]?.category ?? null`,
 * un obstacle a une catégorie `null` → il ne matche jamais et casse les alignements.
 */
export const OBSTACLE_TYPE = '__obstacle__';

export function isObstacle(cell: Cell): boolean {
  return cell === OBSTACLE_TYPE;
}
