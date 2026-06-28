import raw from '@/game_configs.json';

export type BinCategory = 'yellow' | 'black' | 'orange';
export type SpecialCategory = 'piles' | 'textile' | 'verre';
export type WasteCategory = BinCategory | SpecialCategory;

export const BIN_CATEGORIES: readonly BinCategory[] = ['yellow', 'black', 'orange'];
const SPECIAL_CATEGORIES: readonly SpecialCategory[] = ['piles', 'textile', 'verre'];

export function isSpecialCategory(c: WasteCategory): c is SpecialCategory {
  return (SPECIAL_CATEGORIES as readonly string[]).includes(c);
}

export interface WasteDef {
  id: string;
  asset: string;
  category: WasteCategory;
}

export interface LevelConfigRaw {
  level: 1 | 2 | 3;
  size: number;
  gridAsset: string;
  binCapacity: Record<BinCategory, number>;
  binVideAsset: Record<BinCategory, string>;
  wastes: WasteDef[];
  /** Probabilité (0..1) qu'une case rechargée soit un obstacle. Optionnel, défaut 0. */
  obstacleRate?: number;
  /** Nombre d'obstacles présents au démarrage (hors dernière ligne). Optionnel, défaut 0. */
  obstacleInitial?: number;
  /** Nombre minimum d'obstacles maintenu à l'écran (le refill réinjecte sous ce seuil). Optionnel, défaut 0. */
  obstacleMin?: number;
}

export interface Timings {
  idleReturnToHomeMs: number;
  eduOverlayMs: number;
}

export interface DebugConfig {
  /** Rend les 3 étoiles du HUD cliquables pour sauter directement à un niveau (tests). */
  levelStarNav: boolean;
}

export interface GameConfig {
  timings: Timings;
  debug: DebugConfig;
  levels: LevelConfigRaw[];
}

function validate(cfg: GameConfig): GameConfig {
  const dbg = (cfg.debug ?? {}) as Partial<DebugConfig>;
  cfg.debug = { levelStarNav: dbg.levelStarNav ?? false };
  if (cfg.levels.length !== 3) throw new Error('game_configs: 3 niveaux attendus');
  for (const lvl of cfg.levels) {
    lvl.obstacleRate = Math.min(1, Math.max(0, lvl.obstacleRate ?? 0));
    lvl.obstacleInitial = Math.max(0, Math.floor(lvl.obstacleInitial ?? 0));
    lvl.obstacleMin = Math.max(0, Math.floor(lvl.obstacleMin ?? 0));
    const ids = new Set<string>();
    for (const w of lvl.wastes) {
      if (ids.has(w.id)) throw new Error(`game_configs: id déchet dupliqué "${w.id}" niveau ${lvl.level}`);
      ids.add(w.id);
    }
    for (const bin of BIN_CATEGORIES) {
      if (!(lvl.binCapacity[bin] > 0)) throw new Error(`game_configs: capacité ${bin} niveau ${lvl.level}`);
      if (!lvl.wastes.some((w) => w.category === bin)) {
        throw new Error(`game_configs: niveau ${lvl.level} sans déchet ${bin}`);
      }
    }
  }
  return cfg;
}

export const GAME_CONFIG: GameConfig = validate(raw as GameConfig);
