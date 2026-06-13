import type { Grid, Pos } from './grid';
import { cloneGrid, swapCells } from './grid';
import { findMatches, findValidMoves, isValidSwap } from './matching';
import { applyCascade, type CascadeStep } from './cascade';
import { createInitialGrid } from './initial-grid';
import type { LevelConfig } from './levels';
import type { Prng } from './prng';
import { WASTE_META } from './waste-data';
import { BIN_CATEGORIES, isSpecialCategory, type BinCategory, type SpecialCategory } from './config-loader';

export interface GameState {
  level: 1 | 2 | 3;
  config: LevelConfig;
  grid: Grid;
  rows: number;
  cols: number;
  bins: Record<BinCategory, number>;
  isAnimating: boolean;
  isOver: boolean;
}

export function createGameState(config: LevelConfig, prng: Prng): GameState {
  const grid = createInitialGrid(config, prng);
  return {
    level: config.level,
    config,
    grid,
    rows: config.size,
    cols: config.size,
    bins: { yellow: 0, black: 0, orange: 0 },
    isAnimating: false,
    isOver: false,
  };
}

export function isLevelComplete(state: GameState): boolean {
  return BIN_CATEGORIES.every((b) => state.bins[b] >= state.config.binCapacity[b]);
}

export type SwapResult =
  | { kind: 'invalid'; a: Pos; b: Pos }
  | { kind: 'resolved'; a: Pos; b: Pos; events: ResolvedEvent[]; next: GameState };

export interface ResolvedEvent {
  step: CascadeStep;
  /** Catégories spéciales rencontrées dans ce step (piles/textile/verre). */
  specials: SpecialCategory[];
}

export function applySwap(state: GameState, a: Pos, b: Pos, prng: Prng): SwapResult {
  if (state.isOver || state.isAnimating) return { kind: 'invalid', a, b };
  if (!isValidSwap(state.grid, a, b)) return { kind: 'invalid', a, b };

  const nextGrid = cloneGrid(state.grid);
  swapCells(nextGrid, a, b);

  const cascade = applyCascade(nextGrid, state.config, prng);

  const nextBins: Record<BinCategory, number> = { ...state.bins };
  const events: ResolvedEvent[] = [];

  for (const step of cascade.events) {
    const specials: SpecialCategory[] = [];
    for (const m of step.matches) {
      const cat = WASTE_META[m.type]!.category;
      if (isSpecialCategory(cat)) {
        if (!specials.includes(cat)) specials.push(cat);
      } else {
        const cap = state.config.binCapacity[cat as BinCategory];
        nextBins[cat as BinCategory] = Math.min(cap, nextBins[cat as BinCategory] + m.cells.length);
      }
    }
    events.push({ step, specials });
  }

  const isOver = findMatches(nextGrid).length === 0 && findValidMoves(nextGrid).length === 0;

  const next: GameState = {
    ...state,
    grid: nextGrid,
    bins: nextBins,
    isAnimating: false,
    isOver,
  };

  return { kind: 'resolved', a, b, events, next };
}
