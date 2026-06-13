import { GAME_CONFIG, type BinCategory } from './config-loader';
import type { WasteType } from './waste';

export interface LevelConfig {
  level: 1 | 2 | 3;
  size: number;
  wasteTypes: readonly WasteType[];
  binCapacity: Record<BinCategory, number>;
  gridAsset: string;
  binVideAsset: Record<BinCategory, string>;
}

const LEVELS: Record<1 | 2 | 3, LevelConfig> = (() => {
  const out = {} as Record<1 | 2 | 3, LevelConfig>;
  for (const lvl of GAME_CONFIG.levels) {
    out[lvl.level] = {
      level: lvl.level,
      size: lvl.size,
      wasteTypes: lvl.wastes.map((w) => w.id),
      binCapacity: lvl.binCapacity,
      gridAsset: lvl.gridAsset,
      binVideAsset: lvl.binVideAsset,
    };
  }
  return out;
})();

export function getLevelConfig(level: 1 | 2 | 3): LevelConfig {
  return LEVELS[level];
}
