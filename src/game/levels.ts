import type { WasteType } from './waste';

export interface LevelConfig {
  level: 1 | 2 | 3;
  size: 5 | 10 | 15;
  wasteTypes: readonly WasteType[];
  trapTypes: readonly WasteType[];
}

export const LEVEL_1: LevelConfig = {
  level: 1, size: 5,
  wasteTypes: ['plastic_bottle', 'apple', 'tissue', 'battery'],
  trapTypes: ['battery'],
};

export const LEVEL_2: LevelConfig = {
  level: 2, size: 10,
  wasteTypes: [
    'plastic_bottle', 'can', 'cardboard',
    'apple', 'coffee_grounds',
    'tissue', 'dirty_yogurt_pot',
    'battery',
  ],
  trapTypes: ['battery'],
};

export const LEVEL_3: LevelConfig = {
  level: 3, size: 15,
  wasteTypes: [
    'plastic_bottle', 'can', 'cardboard', 'milk_carton',
    'apple', 'coffee_grounds', 'egg_shell',
    'tissue', 'dirty_yogurt_pot', 'broken_toy',
    'battery', 'lightbulb', 'medication',
  ],
  trapTypes: ['battery', 'lightbulb', 'medication'],
};

export function getLevelConfig(level: 1 | 2 | 3): LevelConfig {
  switch (level) {
    case 1: return LEVEL_1;
    case 2: return LEVEL_2;
    case 3: return LEVEL_3;
  }
}
