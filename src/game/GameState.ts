import type { Grid, Pos } from './grid';
import { cloneGrid, swapCells } from './grid';
import { findMatches, findValidMoves, isValidSwap } from './matching';
import { applyCascade, type CascadeStep } from './cascade';
import { computeMatchScore } from './score';
import { createInitialGrid } from './initial-grid';
import type { LevelConfig } from './levels';
import type { Prng } from './prng';
import { WASTE_META } from './waste-data';

export interface GameState {
  level: 1 | 2 | 3;
  config: LevelConfig;
  grid: Grid;
  rows: number;
  cols: number;
  score: number;
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
    score: 0,
    isAnimating: false,
    isOver: false,
  };
}

export type SwapResult =
  | { kind: 'invalid'; a: Pos; b: Pos }
  | { kind: 'resolved'; a: Pos; b: Pos; events: ResolvedEvent[]; scoreDelta: number; next: GameState };

export interface ResolvedEvent {
  step: CascadeStep;
  scoreForStep: number;
  trapEducation: { type: import('./waste').WasteType; text: string }[];
}

export function applySwap(state: GameState, a: Pos, b: Pos, prng: Prng): SwapResult {
  if (state.isOver || state.isAnimating) return { kind: 'invalid', a, b };
  if (!isValidSwap(state.grid, a, b)) return { kind: 'invalid', a, b };

  const nextGrid = cloneGrid(state.grid);
  swapCells(nextGrid, a, b);

  const cascade = applyCascade(nextGrid, state.config, prng);

  let scoreDelta = 0;
  const events: ResolvedEvent[] = [];
  for (const step of cascade.events) {
    let scoreForStep = 0;
    const trapEducation: ResolvedEvent['trapEducation'] = [];
    for (const m of step.matches) {
      const meta = WASTE_META[m.type];
      const hasTrap = meta.bin === 'hazardous';
      scoreForStep += computeMatchScore({ size: m.cells.length, hasTrap, cascadeIndex: step.cascadeIndex });
      if (hasTrap && meta.educationalText) {
        trapEducation.push({ type: m.type, text: meta.educationalText });
      }
    }
    events.push({ step, scoreForStep, trapEducation });
    scoreDelta += scoreForStep;
  }

  const isOver = findMatches(nextGrid).length === 0 && findValidMoves(nextGrid).length === 0;

  const next: GameState = {
    ...state,
    grid: nextGrid,
    score: state.score + scoreDelta,
    isAnimating: false,
    isOver,
  };

  return { kind: 'resolved', a, b, events, scoreDelta, next };
}
