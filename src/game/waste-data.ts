import type { WasteMeta, WasteType } from './waste';
import { GAME_CONFIG } from './config-loader';

const meta: Record<WasteType, WasteMeta> = {};
const all: WasteType[] = [];
for (const lvl of GAME_CONFIG.levels) {
  for (const w of lvl.wastes) {
    if (!meta[w.id]) {
      meta[w.id] = { type: w.id, category: w.category, asset: w.asset };
      all.push(w.id);
    }
  }
}

export const WASTE_META: Record<WasteType, WasteMeta> = meta;
export const ALL_WASTE_TYPES: readonly WasteType[] = all;
