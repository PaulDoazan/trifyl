# Trifyl — Refonte flux, poubelles & assets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le choix de niveau par un flux Veille→Accueil→niveaux, piloter la progression par le remplissage des 3 poubelles, supprimer le score, ajouter croix + règle 1×/partie au message piles, retour Accueil à 5 min, externaliser la config dans `game_configs.json` et câbler les vrais assets PNG.

**Architecture :** La config (niveaux, déchets, capacités, timings) est chargée depuis `game_configs.json` via un loader typé. Les déchets deviennent data-driven (id `string` + catégorie). La logique de jeu (GameState) compte le remplissage des poubelles et détecte « 3 pleines = niveau terminé ». Les écrans DOM (Veille, Accueil, fenêtre fin de niveau, overlays) et un `FileAssetProvider` Pixi câblent les PNG. `App` orchestre la navigation et l'inactivité.

**Tech Stack :** TypeScript, Vite, Pixi.js v8, GSAP, Vitest. Chemins via alias `@/` → `src/`.

**Référence spec :** `docs/superpowers/specs/2026-06-13-trifyl-flow-assets-refonte-design.md`

---

## Plan de fichiers

**Créés :**
- `src/game_configs.json` — config éditable (timings + niveaux + déchets)
- `src/game/config-loader.ts` — charge/valide le JSON, expose `GAME_CONFIG`, types
- `src/assets/FileAssetProvider.ts` — charge les PNG via Pixi `Assets`
- `src/ui/screens/VeilleScreen.ts` — écran d'attract
- `src/ui/screens/HomeScreen.ts` — Accueil (consignes + Commencer)
- `src/ui/overlays/LevelCompleteOverlay.ts` — fenêtre « Niveau terminé »
- `src/ui/BinGauge.ts` — jauge de remplissage d'une poubelle (HUD)
- `tests/config-loader.test.ts`, `tests/bin-fill.test.ts`

**Modifiés :**
- `src/game/waste.ts` — `WasteType=string`, `WasteCategory`, `BinCategory`
- `src/game/waste-data.ts` — `WASTE_META` dérivé du config
- `src/game/levels.ts` — `LevelConfig` + `getLevelConfig` depuis config
- `src/game/cascade.ts`, `src/game/initial-grid.ts` — ids string
- `src/game/GameState.ts` — supprime score, ajoute compteurs poubelles + `isLevelComplete`
- `src/ui/HUD.ts` — supprime score, intègre les 3 `BinGauge`
- `src/ui/overlays/EduOverlay.ts` — croix de fermeture
- `src/ui/overlays/EndOverlay.ts` — supprime score, croix
- `src/ui/screens/GameScreen.ts` — multi-niveaux, remplissage poubelles, fin de niveau
- `src/ui/screens/EndMediaScreen.ts` — supprime score
- `src/input/IdleTracker.ts` — délai depuis config (inchangé en logique)
- `src/app/App.ts` — nouvelle orchestration (Veille/Accueil/Média + idle)
- `src/app/config.ts` — retire `IDLE_MS`/`EDU_OVERLAY_MS` (→ config JSON)
- `src/assets/AssetProvider.ts` — interface étendue
- `src/assets/PlaceholderAssetProvider.ts` — implémente l'interface étendue (tests)

**Supprimés :**
- `src/game/score.ts`, `tests/score.test.ts`
- `src/render/ScreensaverScene.ts`, `src/ui/screens/ScreensaverScreen.ts`
- `src/ui/screens/WelcomeScreen.ts` (remplacé par Home + Veille)

---

# Phase 1 — Fondation config & modèle déchets data-driven

### Task 1 : `game_configs.json`

**Files:**
- Create: `src/game_configs.json`

- [ ] **Step 1 : Créer le fichier config**

```json
{
  "timings": {
    "idleReturnToHomeMs": 300000,
    "eduOverlayMs": 4500
  },
  "levels": [
    {
      "level": 1,
      "size": 5,
      "gridAsset": "grille/grille_niv1",
      "binCapacity": { "yellow": 9, "black": 9, "orange": 9 },
      "binVideAsset": {
        "yellow": "poubelles/niv1_poub_jaune_vide",
        "black": "poubelles/niv1_poub_noire_vide",
        "orange": "poubelles/niv1_poub_orange_vide"
      },
      "wastes": [
        { "id": "eau", "asset": "dechets_niveau 1/eau", "category": "yellow" },
        { "id": "canette", "asset": "dechets_niveau 1/canette", "category": "yellow" },
        { "id": "banane", "asset": "dechets_niveau 1/banane", "category": "orange" },
        { "id": "pelure_orange", "asset": "dechets_niveau 1/pelure_orange", "category": "orange" },
        { "id": "yaourt", "asset": "dechets_niveau 1/yaourt", "category": "black" },
        { "id": "couche", "asset": "dechets_niveau 1/couche", "category": "black" }
      ]
    },
    {
      "level": 2,
      "size": 8,
      "gridAsset": "grille/grille_niv2",
      "binCapacity": { "yellow": 12, "black": 10, "orange": 10 },
      "binVideAsset": {
        "yellow": "poubelles/niv2_poub_jaune_vide",
        "black": "poubelles/niv2_poub_noire_vide",
        "orange": "poubelles/niv2_poub_orange_vide"
      },
      "wastes": [
        { "id": "eau", "asset": "dechets_niveau 2/eau", "category": "yellow" },
        { "id": "canette", "asset": "dechets_niveau 2/canette", "category": "yellow" },
        { "id": "conserve", "asset": "dechets_niveau 2/conserve", "category": "yellow" },
        { "id": "journal", "asset": "dechets_niveau 2/journal", "category": "yellow" },
        { "id": "banane", "asset": "dechets_niveau 2/banane", "category": "orange" },
        { "id": "carotte", "asset": "dechets_niveau 2/carotte", "category": "orange" },
        { "id": "yaourt", "asset": "dechets_niveau 2/yaourt", "category": "black" },
        { "id": "mouchoir", "asset": "dechets_niveau 2/mouchoir", "category": "black" },
        { "id": "pile", "asset": "dechets_niveau 2/pile", "category": "piles" },
        { "id": "verre_brise", "asset": "dechets_niveau 2/verre_brise", "category": "verre" }
      ]
    },
    {
      "level": 3,
      "size": 10,
      "gridAsset": "grille/grille_niv3",
      "binCapacity": { "yellow": 14, "black": 12, "orange": 12 },
      "binVideAsset": {
        "yellow": "poubelles/niv3_poub_jaune_vide",
        "black": "poubelles/niv3_poub_noire_vide",
        "orange": "poubelles/niv3_poub_orange_vide"
      },
      "wastes": [
        { "id": "eau", "asset": "dechets_niveau 3/eau", "category": "yellow" },
        { "id": "canette", "asset": "dechets_niveau 3/canette", "category": "yellow" },
        { "id": "conserve", "asset": "dechets_niveau 3/conserve", "category": "yellow" },
        { "id": "journal", "asset": "dechets_niveau 3/journal", "category": "yellow" },
        { "id": "lait", "asset": "dechets_niveau 3/lait", "category": "yellow" },
        { "id": "banane", "asset": "dechets_niveau 3/banane", "category": "orange" },
        { "id": "carotte", "asset": "dechets_niveau 3/carotte", "category": "orange" },
        { "id": "poisson", "asset": "dechets_niveau 3/poisson", "category": "orange" },
        { "id": "yaourt", "asset": "dechets_niveau 3/yaourt", "category": "black" },
        { "id": "mouchoir", "asset": "dechets_niveau 3/mouchoir", "category": "black" },
        { "id": "masque", "asset": "dechets_niveau 3/masque", "category": "black" },
        { "id": "pile", "asset": "dechets_niveau 3/pile", "category": "piles" },
        { "id": "portable", "asset": "dechets_niveau 3/portable", "category": "piles" },
        { "id": "verre_brise", "asset": "dechets_niveau 3/verre_brise", "category": "verre" },
        { "id": "teeshirt", "asset": "dechets_niveau 3/teeshirt", "category": "textile" }
      ]
    }
  ]
}
```

> Note mapping : catégories éditables par l'utilisateur. `piles`/`textile`/`verre` = catégories spéciales (vident la grille, ne remplissent pas de poubelle, déclenchent un message). Les chemins `asset` sont relatifs à `src/assets/files/` sans extension.

- [ ] **Step 2 : Commit**

```bash
git add src/game_configs.json
git commit -m "feat(config): add editable game_configs.json (levels, wastes, timings)"
```

---

### Task 2 : Loader de config typé

**Files:**
- Create: `src/game/config-loader.ts`
- Test: `tests/config-loader.test.ts`

- [ ] **Step 1 : Écrire le test (FAIL)**

```ts
// tests/config-loader.test.ts
import { describe, it, expect } from 'vitest';
import { GAME_CONFIG, BIN_CATEGORIES, isSpecialCategory } from '@/game/config-loader';

describe('config-loader', () => {
  it('expose 3 niveaux avec tailles 5/8/10', () => {
    expect(GAME_CONFIG.levels.map((l) => l.size)).toEqual([5, 8, 10]);
  });

  it('chaque niveau a une capacité pour les 3 poubelles', () => {
    for (const lvl of GAME_CONFIG.levels) {
      for (const bin of BIN_CATEGORIES) {
        expect(lvl.binCapacity[bin]).toBeGreaterThan(0);
      }
    }
  });

  it('chaque niveau a au moins une catégorie poubelle de chaque type', () => {
    for (const lvl of GAME_CONFIG.levels) {
      for (const bin of BIN_CATEGORIES) {
        const hasBin = lvl.wastes.some((w) => w.category === bin);
        expect(hasBin, `niveau ${lvl.level} sans déchet ${bin}`).toBe(true);
      }
    }
  });

  it('chaque niveau a >= 4 types de déchets', () => {
    for (const lvl of GAME_CONFIG.levels) {
      expect(lvl.wastes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('isSpecialCategory distingue poubelles et spéciaux', () => {
    expect(isSpecialCategory('yellow')).toBe(false);
    expect(isSpecialCategory('piles')).toBe(true);
    expect(isSpecialCategory('verre')).toBe(true);
  });

  it('timings cohérents', () => {
    expect(GAME_CONFIG.timings.idleReturnToHomeMs).toBe(300000);
    expect(GAME_CONFIG.timings.eduOverlayMs).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2 : Lancer le test (FAIL attendu)**

Run: `npm test -- config-loader`
Expected: FAIL — `Cannot find module '@/game/config-loader'`

- [ ] **Step 3 : Implémenter le loader**

```ts
// src/game/config-loader.ts
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
}

export interface Timings {
  idleReturnToHomeMs: number;
  eduOverlayMs: number;
}

export interface GameConfig {
  timings: Timings;
  levels: LevelConfigRaw[];
}

function validate(cfg: GameConfig): GameConfig {
  if (cfg.levels.length !== 3) throw new Error('game_configs: 3 niveaux attendus');
  for (const lvl of cfg.levels) {
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
```

- [ ] **Step 4 : Activer l'import JSON (tsconfig)**

Vérifier que `resolveJsonModule` est actif dans `tsconfig.json`. Si absent, l'ajouter sous `compilerOptions`:
```json
"resolveJsonModule": true,
```
Run: `npx tsc -b` — Expected: pas d'erreur sur l'import JSON.

- [ ] **Step 5 : Lancer le test (PASS attendu)**

Run: `npm test -- config-loader`
Expected: PASS (6 tests)

- [ ] **Step 6 : Commit**

```bash
git add src/game/config-loader.ts tests/config-loader.test.ts tsconfig.json
git commit -m "feat(config): typed loader for game_configs.json with validation"
```

---

### Task 3 : Modèle déchets data-driven (`waste.ts`, `waste-data.ts`, `levels.ts`)

**Files:**
- Modify: `src/game/waste.ts`
- Modify: `src/game/waste-data.ts`
- Modify: `src/game/levels.ts`
- Modify: `tests/waste-data.test.ts`, `tests/levels.test.ts`

- [ ] **Step 1 : Réécrire `waste.ts`**

```ts
// src/game/waste.ts
import type { WasteCategory } from './config-loader';

export type { WasteCategory, BinCategory, SpecialCategory } from './config-loader';

// Un déchet est identifié par un id libre (clé du config).
export type WasteType = string;

export interface WasteMeta {
  type: WasteType;
  category: WasteCategory;
  asset: string;
}
```

- [ ] **Step 2 : Réécrire `waste-data.ts` (dérivé du config)**

```ts
// src/game/waste-data.ts
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
```

- [ ] **Step 3 : Réécrire `levels.ts`**

```ts
// src/game/levels.ts
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
```

- [ ] **Step 4 : Réécrire `tests/waste-data.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ALL_WASTE_TYPES, WASTE_META } from '@/game/waste-data';
import { isSpecialCategory } from '@/game/config-loader';

describe('waste-data', () => {
  it('chaque type a des métadonnées avec asset', () => {
    for (const t of ALL_WASTE_TYPES) {
      const m = WASTE_META[t];
      expect(m, `missing meta for ${t}`).toBeDefined();
      expect(m.asset.length).toBeGreaterThan(0);
    }
  });

  it('catégories connues', () => {
    for (const t of ALL_WASTE_TYPES) {
      expect(['yellow', 'black', 'orange', 'piles', 'textile', 'verre']).toContain(WASTE_META[t].category);
    }
  });

  it('mapping de référence', () => {
    expect(WASTE_META.eau.category).toBe('yellow');
    expect(WASTE_META.banane.category).toBe('orange');
    expect(WASTE_META.yaourt.category).toBe('black');
    expect(isSpecialCategory(WASTE_META.pile.category)).toBe(true);
  });
});
```

- [ ] **Step 5 : Réécrire `tests/levels.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { getLevelConfig } from '@/game/levels';

describe('level configs', () => {
  it('tailles de grille 5/8/10', () => {
    expect(getLevelConfig(1).size).toBe(5);
    expect(getLevelConfig(2).size).toBe(8);
    expect(getLevelConfig(3).size).toBe(10);
  });

  it('au moins 4 types par niveau', () => {
    for (const l of [1, 2, 3] as const) {
      expect(getLevelConfig(l).wasteTypes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('capacité définie pour les 3 poubelles', () => {
    for (const l of [1, 2, 3] as const) {
      const cfg = getLevelConfig(l);
      expect(cfg.binCapacity.yellow).toBeGreaterThan(0);
      expect(cfg.binCapacity.black).toBeGreaterThan(0);
      expect(cfg.binCapacity.orange).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 6 : Lancer les tests data**

Run: `npm test -- waste-data levels config-loader`
Expected: PASS. (cascade/initial-grid utilisent `level.wasteTypes` et `WasteType=string` — toujours compatibles.)

- [ ] **Step 7 : Commit**

```bash
git add src/game/waste.ts src/game/waste-data.ts src/game/levels.ts tests/waste-data.test.ts tests/levels.test.ts
git commit -m "refactor(game): data-driven waste model from config (WasteType=string, categories)"
```

---

# Phase 2 — Mécanique poubelles & suppression du score

### Task 4 : GameState — compteurs poubelles, suppression score

**Files:**
- Modify: `src/game/GameState.ts`
- Delete: `src/game/score.ts`, `tests/score.test.ts`
- Test: `tests/bin-fill.test.ts`
- Modify: `tests/game-state.test.ts` (adapter aux champs)

- [ ] **Step 1 : Écrire `tests/bin-fill.test.ts` (FAIL)**

```ts
import { describe, it, expect } from 'vitest';
import { createGameState, applySwap, isLevelComplete } from '@/game/GameState';
import { getLevelConfig } from '@/game/levels';
import { createPrng } from '@/game/prng';

describe('bin fill mechanic', () => {
  it('nouvel état : compteurs poubelles à 0, niveau non terminé', () => {
    const s = createGameState(getLevelConfig(1), createPrng(1));
    expect(s.bins).toEqual({ yellow: 0, black: 0, orange: 0 });
    expect(isLevelComplete(s)).toBe(false);
  });

  it('isLevelComplete vrai quand les 3 poubelles atteignent leur capacité', () => {
    const cfg = getLevelConfig(1);
    const s = createGameState(cfg, createPrng(1));
    s.bins = { ...cfg.binCapacity };
    expect(isLevelComplete(s)).toBe(true);
  });

  it('isLevelComplete faux si une poubelle est sous capacité', () => {
    const cfg = getLevelConfig(1);
    const s = createGameState(cfg, createPrng(1));
    s.bins = { ...cfg.binCapacity, orange: cfg.binCapacity.orange - 1 };
    expect(isLevelComplete(s)).toBe(false);
  });

  it('applySwap ne renvoie plus de score, renvoie des events', () => {
    const s = createGameState(getLevelConfig(1), createPrng(42));
    const r = applySwap(s, { row: 0, col: 0 }, { row: 0, col: 1 }, createPrng(42));
    expect(r).toHaveProperty('kind');
    expect(r).not.toHaveProperty('scoreDelta');
  });
});
```

- [ ] **Step 2 : Lancer (FAIL attendu)**

Run: `npm test -- bin-fill`
Expected: FAIL — `isLevelComplete` / `s.bins` indéfinis.

- [ ] **Step 3 : Réécrire `GameState.ts`**

```ts
// src/game/GameState.ts
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
```

- [ ] **Step 4 : Supprimer le module score**

```bash
git rm src/game/score.ts tests/score.test.ts
```

- [ ] **Step 5 : Adapter `tests/game-state.test.ts`**

Ouvrir `tests/game-state.test.ts` ; remplacer toute assertion sur `state.score` / `result.scoreDelta` par des assertions sur `state.bins` (ex: `expect(state.bins.yellow).toBeGreaterThanOrEqual(0)`) et sur `result.kind`. Retirer tout import de `@/game/score`.

- [ ] **Step 6 : Lancer toute la suite**

Run: `npm test`
Expected: PASS (score.test supprimé ; bin-fill PASS ; matching/cascade/grid/initial-grid inchangés).

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat(game): bin-fill progression + level-complete detection, remove scoring"
```

---

# Phase 3 — Intégration assets (Pixi)

### Task 5 : Étendre `AssetProvider` + `FileAssetProvider`

**Files:**
- Modify: `src/assets/AssetProvider.ts`
- Create: `src/assets/FileAssetProvider.ts`
- Modify: `src/assets/PlaceholderAssetProvider.ts`

- [ ] **Step 1 : Étendre l'interface `AssetProvider`**

```ts
// src/assets/AssetProvider.ts
import type { Texture } from 'pixi.js';
import type { BinCategory } from '@/game/config-loader';
import type { WasteType } from '@/game/waste';

export type ScreenImageKey = 'veille' | 'home';
export type ButtonKey = 'commencer' | 'quitter' | 'home' | 'touchez';
export type PopupKey = 'piles' | 'textile' | 'verre' | 'combinaison';

export interface AssetProvider {
  init(): Promise<void>;
  getTileTexture(type: WasteType): Texture;
  getBinIdleTexture(bin: BinCategory): Texture;
  getBinOpenFrames(bin: BinCategory): Texture[];
  // nouveaux
  getScreenImageUrl(key: ScreenImageKey): string;
  getButtonUrl(key: ButtonKey): string;
  getPopupUrl(key: PopupKey): string;
  getGridUrl(level: 1 | 2 | 3): string;
  getBinVideTexture(level: 1 | 2 | 3, bin: BinCategory): Texture;
  getBinPleineTexture(bin: BinCategory): Texture;
}
```

- [ ] **Step 2 : Créer `FileAssetProvider`**

> Les images d'écran/boutons/pop-ups sont utilisées en CSS `background-image` dans le DOM → on expose leur URL (via Vite `import.meta.glob` en `eager` + `as: 'url'`). Les textures de tuiles/poubelles sont chargées dans Pixi via `Assets.load`.

```ts
// src/assets/FileAssetProvider.ts
import { Assets, type Texture } from 'pixi.js';
import type { AssetProvider, ScreenImageKey, ButtonKey, PopupKey } from './AssetProvider';
import type { BinCategory } from '@/game/config-loader';
import type { WasteType } from '@/game/waste';
import { WASTE_META, ALL_WASTE_TYPES } from '@/game/waste-data';

// URL de chaque PNG sous src/assets/files (résolu par Vite au build).
const FILES = import.meta.glob('./files/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

function url(relative: string): string {
  const key = `./files/${relative}.png`;
  const u = FILES[key];
  if (!u) throw new Error(`asset introuvable: ${key}`);
  return u;
}

const BINS: readonly BinCategory[] = ['yellow', 'black', 'orange'];
const BIN_FILE: Record<BinCategory, string> = { yellow: 'jaune', black: 'noire', orange: 'orange' };

export class FileAssetProvider implements AssetProvider {
  private tiles = new Map<WasteType, Texture>();
  private binVide = new Map<string, Texture>();
  private binPleine = new Map<BinCategory, Texture>();

  async init(): Promise<void> {
    // Tuiles
    for (const t of ALL_WASTE_TYPES) {
      this.tiles.set(t, await Assets.load(url(WASTE_META[t]!.asset)));
    }
    // Poubelles
    for (const bin of BINS) {
      this.binPleine.set(bin, await Assets.load(url(`poubelles/poub_${BIN_FILE[bin]}_pleine`)));
      for (const lvl of [1, 2, 3] as const) {
        this.binVide.set(`${lvl}:${bin}`, await Assets.load(url(`poubelles/niv${lvl}_poub_${BIN_FILE[bin]}_vide`)));
      }
    }
  }

  getTileTexture(type: WasteType): Texture {
    const t = this.tiles.get(type);
    if (!t) throw new Error(`pas de texture pour ${type}`);
    return t;
  }

  // Poubelles "ouverture" non utilisées en HUD jauge ; on renvoie la texture vide niveau 1 par défaut.
  getBinIdleTexture(bin: BinCategory): Texture { return this.binVide.get(`1:${bin}`)!; }
  getBinOpenFrames(bin: BinCategory): Texture[] { return [this.binVide.get(`1:${bin}`)!]; }

  getScreenImageUrl(key: ScreenImageKey): string {
    return key === 'veille' ? url('veille/veille') : url('home/home');
  }
  getButtonUrl(key: ButtonKey): string { return url(`boutons/${key}`); }
  getPopupUrl(key: PopupKey): string { return url(`pop up/${key}`); }
  getGridUrl(level: 1 | 2 | 3): string { return url(`grille/grille_niv${level}`); }

  getBinVideTexture(level: 1 | 2 | 3, bin: BinCategory): Texture {
    return this.binVide.get(`${level}:${bin}`)!;
  }
  getBinPleineTexture(bin: BinCategory): Texture {
    return this.binPleine.get(bin)!;
  }
}
```

- [ ] **Step 3 : Mettre `PlaceholderAssetProvider` en conformité avec l'interface étendue**

Dans `src/assets/PlaceholderAssetProvider.ts`, changer la signature `getBinIdleTexture`/`getBinOpenFrames` de `Exclude<BinKind,'hazardous'>` vers `BinCategory` (import depuis `@/game/config-loader`), et ajouter des stubs pour les nouvelles méthodes (utilisés uniquement par les tests Pixi, pas critiques) :

```ts
  getScreenImageUrl(): string { return ''; }
  getButtonUrl(): string { return ''; }
  getPopupUrl(): string { return ''; }
  getGridUrl(): string { return ''; }
  getBinVideTexture(_l: 1 | 2 | 3, bin: import('@/game/config-loader').BinCategory) { return this.getBinIdleTexture(bin); }
  getBinPleineTexture(bin: import('@/game/config-loader').BinCategory) { return this.getBinIdleTexture(bin); }
```
Et remplacer toutes les occurrences de `'yellow' | 'black' | 'orange'` typées `Exclude<BinKind,'hazardous'>` par `BinCategory`.

- [ ] **Step 4 : Vérifier compilation**

Run: `npx tsc -b`
Expected: pas d'erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/assets/
git commit -m "feat(assets): FileAssetProvider loading PNGs (tiles, bins, screens, popups)"
```

---

# Phase 4 — Écrans & overlays

### Task 6 : `VeilleScreen` (attract)

**Files:**
- Create: `src/ui/screens/VeilleScreen.ts`
- Modify: `src/styles/screens.css`

- [ ] **Step 1 : Implémenter le composant**

```ts
// src/ui/screens/VeilleScreen.ts
export interface VeilleCallbacks { onStart: () => void; }

export class VeilleScreen {
  readonly root: HTMLElement;

  constructor(bgUrl: string, touchezUrl: string, callbacks: VeilleCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen veille';
    el.style.backgroundImage = `url("${bgUrl}")`;
    el.innerHTML = `<button class="veille__touch" aria-label="Toucher pour commencer"></button>`;
    const btn = el.querySelector('.veille__touch') as HTMLButtonElement;
    btn.style.backgroundImage = `url("${touchezUrl}")`;
    el.onclick = () => callbacks.onStart();
    this.root = el;
  }
}
```

- [ ] **Step 2 : CSS**

Ajouter à `src/styles/screens.css` :
```css
.veille {
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-color: #fff;
  cursor: pointer;
}
.veille__touch {
  position: absolute;
  left: 50%;
  bottom: 120px;
  transform: translateX(-50%);
  width: 260px;
  height: 90px;
  border: none;
  background: center / contain no-repeat;
  background-color: transparent;
  cursor: pointer;
}
```

- [ ] **Step 3 : Commit**

```bash
git add src/ui/screens/VeilleScreen.ts src/styles/screens.css
git commit -m "feat(ui): VeilleScreen attract screen (veille.png + touchez)"
```

---

### Task 7 : `HomeScreen` (Accueil consignes)

**Files:**
- Create: `src/ui/screens/HomeScreen.ts`
- Delete: `src/ui/screens/WelcomeScreen.ts`
- Modify: `src/styles/screens.css`

- [ ] **Step 1 : Implémenter**

```ts
// src/ui/screens/HomeScreen.ts
export interface HomeCallbacks { onStart: () => void; }

export class HomeScreen {
  readonly root: HTMLElement;

  constructor(bgUrl: string, commencerUrl: string, callbacks: HomeCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen home';
    el.style.backgroundImage = `url("${bgUrl}")`;
    el.innerHTML = `<button class="home__start" aria-label="Commencer"></button>`;
    const btn = el.querySelector('.home__start') as HTMLButtonElement;
    btn.style.backgroundImage = `url("${commencerUrl}")`;
    btn.onclick = (e) => { e.stopPropagation(); callbacks.onStart(); };
    this.root = el;
  }
}
```

- [ ] **Step 2 : CSS + suppression WelcomeScreen**

Ajouter à `screens.css` :
```css
.home {
  background-size: cover;
  background-position: center;
  background-color: #243018;
}
.home__start {
  position: absolute;
  right: 80px;
  bottom: 80px;
  width: 220px;
  height: 70px;
  border: none;
  background: center / contain no-repeat;
  background-color: transparent;
  cursor: pointer;
}
```
```bash
git rm src/ui/screens/WelcomeScreen.ts
```

- [ ] **Step 3 : Commit**

```bash
git add src/ui/screens/HomeScreen.ts src/styles/screens.css
git commit -m "feat(ui): HomeScreen (consignes home.png + bouton Commencer), drop WelcomeScreen"
```

---

### Task 8 : `BinGauge` (jauge poubelle HUD) + refonte `HUD`

**Files:**
- Create: `src/ui/BinGauge.ts`
- Modify: `src/ui/HUD.ts`
- Modify: `src/styles/menu.css`

- [ ] **Step 1 : `BinGauge` — remplissage progressif par masque DOM**

> Deux images empilées : `vide` au-dessus, `pleine` en dessous, révélée par la hauteur d'un conteneur `overflow:hidden` ancré en bas. Utilise les **URLs** des textures via leur `source` ; plus simple : on passe les URLs directement. On expose donc les URLs des poubelles aussi.

Ajouter dans `AssetProvider` (et `FileAssetProvider`) deux helpers URL :
```ts
// AssetProvider.ts (interface)
getBinVideUrl(level: 1 | 2 | 3, bin: BinCategory): string;
getBinPleineUrl(bin: BinCategory): string;
```
```ts
// FileAssetProvider.ts
getBinVideUrl(level: 1 | 2 | 3, bin: BinCategory): string {
  return url(`poubelles/niv${level}_poub_${BIN_FILE[bin]}_vide`);
}
getBinPleineUrl(bin: BinCategory): string {
  return url(`poubelles/poub_${BIN_FILE[bin]}_pleine`);
}
```
```ts
// PlaceholderAssetProvider.ts (stubs)
getBinVideUrl(): string { return ''; }
getBinPleineUrl(): string { return ''; }
```

```ts
// src/ui/BinGauge.ts
export class BinGauge {
  readonly root: HTMLElement;
  private fill: HTMLElement;
  private fillImg: HTMLElement;

  constructor(videUrl: string, pleineUrl: string) {
    const el = document.createElement('div');
    el.className = 'bin-gauge';

    const vide = document.createElement('div');
    vide.className = 'bin-gauge__vide';
    vide.style.backgroundImage = `url("${videUrl}")`;

    this.fill = document.createElement('div');
    this.fill.className = 'bin-gauge__fill';
    this.fill.style.height = '0%';

    this.fillImg = document.createElement('div');
    this.fillImg.className = 'bin-gauge__pleine';
    this.fillImg.style.backgroundImage = `url("${pleineUrl}")`;
    this.fill.appendChild(this.fillImg);

    el.appendChild(this.fill);
    el.appendChild(vide);
    this.root = el;
  }

  /** ratio ∈ [0,1] */
  setFill(ratio: number): void {
    const pct = Math.max(0, Math.min(1, ratio)) * 100;
    this.fill.style.height = `${pct}%`;
  }
}
```

- [ ] **Step 2 : CSS jauge**

Ajouter à `menu.css` :
```css
.bin-gauge { position: relative; width: 140px; height: 180px; }
.bin-gauge__vide,
.bin-gauge__pleine { position: absolute; inset: 0; background: center / contain no-repeat; }
.bin-gauge__fill {
  position: absolute; left: 0; right: 0; bottom: 0;
  overflow: hidden;
  transition: height 400ms ease-out;
}
.bin-gauge__pleine { position: absolute; left: 0; bottom: 0; width: 140px; height: 180px; }
```
> `.bin-gauge__fill` ancré en bas, hauteur croissante, `overflow:hidden` ; l'image pleine garde sa taille/position (ancrée en bas) → révélation de bas en haut.

- [ ] **Step 3 : Refonte `HUD` (suppression score, 3 jauges)**

```ts
// src/ui/HUD.ts
import { MENU_WIDTH } from '@/app/config';
import type { AssetProvider } from '@/assets/AssetProvider';
import { BIN_CATEGORIES, type BinCategory } from '@/game/config-loader';
import { BinGauge } from './BinGauge';

export interface HUDCallbacks {
  onHome: () => void;
  onQuit: () => void;
}

export class HUD {
  readonly root: HTMLElement;
  private gauges: Record<BinCategory, BinGauge>;

  constructor(level: 1 | 2 | 3, assets: AssetProvider, homeUrl: string, quitterUrl: string, callbacks: HUDCallbacks) {
    const m = document.createElement('aside');
    m.className = 'menu';
    m.style.width = `${MENU_WIDTH}px`;

    const lvl = document.createElement('div');
    lvl.className = 'menu__level';
    lvl.textContent = `Niveau ${String(level).padStart(2, '0')}`;

    const binsWrap = document.createElement('div');
    binsWrap.className = 'menu__bins';
    this.gauges = {} as Record<BinCategory, BinGauge>;
    for (const bin of BIN_CATEGORIES) {
      const g = new BinGauge(assets.getBinVideUrl(level, bin), assets.getBinPleineUrl(bin));
      this.gauges[bin] = g;
      binsWrap.appendChild(g.root);
    }

    const footer = document.createElement('div');
    footer.className = 'menu__footer';
    const homeBtn = document.createElement('button');
    homeBtn.className = 'menu__btn menu__btn--icon';
    homeBtn.style.backgroundImage = `url("${homeUrl}")`;
    homeBtn.onclick = callbacks.onHome;
    const quitBtn = document.createElement('button');
    quitBtn.className = 'menu__btn menu__btn--icon';
    quitBtn.style.backgroundImage = `url("${quitterUrl}")`;
    quitBtn.onclick = callbacks.onQuit;
    footer.append(homeBtn, quitBtn);

    m.append(lvl, binsWrap, footer);
    this.root = m;
  }

  setFill(bin: BinCategory, ratio: number): void {
    this.gauges[bin].setFill(ratio);
  }

  destroy(): void { this.root.remove(); }
}
```

- [ ] **Step 4 : Adapter `menu.css`** — retirer les styles `.menu__score*` ; styler `.menu__bins` en colonne (flex column, gap), `.menu__btn--icon` (bouton image, ~120×60, fond transparent).

- [ ] **Step 5 : Compilation**

Run: `npx tsc -b` — Expected: pas d'erreur (les appels HUD seront mis à jour en Task 11).

- [ ] **Step 6 : Commit**

```bash
git add src/ui/BinGauge.ts src/ui/HUD.ts src/styles/menu.css src/assets/AssetProvider.ts src/assets/FileAssetProvider.ts src/assets/PlaceholderAssetProvider.ts
git commit -m "feat(ui): bin gauges in HUD, remove score display"
```

---

### Task 9 : `EduOverlay` (croix) + `EndOverlay` (croix, sans score)

**Files:**
- Modify: `src/ui/overlays/EduOverlay.ts`
- Modify: `src/ui/overlays/EndOverlay.ts`
- Modify: `src/styles/overlays.css`

- [ ] **Step 1 : `EduOverlay` — image pop-up + croix + auto-close configurable**

```ts
// src/ui/overlays/EduOverlay.ts
import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';
import { GAME_CONFIG } from '@/game/config-loader';

export class EduOverlay {
  readonly root: HTMLElement;
  private img: HTMLElement;
  private timeoutId: number | null = null;

  constructor() {
    const el = document.createElement('div');
    el.className = 'overlay overlay--edu';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="overlay-edu__img"></div>
      <button class="overlay-edu__close" aria-label="Fermer">×</button>
    `;
    this.img = el.querySelector('.overlay-edu__img') as HTMLElement;
    (el.querySelector('.overlay-edu__close') as HTMLButtonElement).onclick = () => this.hide();
    this.root = el;
  }

  /** popupUrl = image (piles/textile/verre). */
  show(popupUrl: string): void {
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.img.style.backgroundImage = `url("${popupUrl}")`;
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
    this.timeoutId = window.setTimeout(() => this.hide(), GAME_CONFIG.timings.eduOverlayMs);
  }

  hide(): void {
    if (this.timeoutId !== null) { window.clearTimeout(this.timeoutId); this.timeoutId = null; }
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
```

- [ ] **Step 2 : `EndOverlay` — image combinaison.png + croix, sans score**

```ts
// src/ui/overlays/EndOverlay.ts
import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';

export class EndOverlay {
  readonly root: HTMLElement;

  constructor(combinaisonUrl: string, onQuit: () => void) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--end';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="overlay-end__img"></div>
      <button class="overlay-end__close" aria-label="Fermer">×</button>
      <button class="overlay-end__quit" data-quit>Quitter</button>
    `;
    (el.querySelector('.overlay-end__img') as HTMLElement).style.backgroundImage = `url("${combinaisonUrl}")`;
    (el.querySelector('.overlay-end__close') as HTMLButtonElement).onclick = () => this.hide();
    (el.querySelector('[data-quit]') as HTMLButtonElement).onclick = onQuit;
    this.root = el;
  }

  show(): void {
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
  }
  hide(): void {
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
```

- [ ] **Step 3 : CSS overlays**

Ajouter/ajuster dans `overlays.css` :
```css
.overlay-edu__img,
.overlay-end__img { background: center / contain no-repeat; }
.overlay--edu { position: absolute; left: 0; right: 0; bottom: 40px; display: flex; justify-content: center; }
.overlay-edu__img { width: 900px; height: 160px; }
.overlay-edu__close,
.overlay-end__close {
  position: absolute; top: 8px; right: 16px;
  width: 48px; height: 48px; border: none; border-radius: 50%;
  font-size: 28px; line-height: 1; cursor: pointer;
  background: rgba(0,0,0,0.15); color: #243018;
}
.overlay-end__quit { /* bouton Quitter, style cohérent thème */ }
```

- [ ] **Step 4 : Commit**

```bash
git add src/ui/overlays/EduOverlay.ts src/ui/overlays/EndOverlay.ts src/styles/overlays.css
git commit -m "feat(ui): close cross on edu/end overlays, image popups, no score"
```

---

### Task 10 : `LevelCompleteOverlay` (Continuer / Quitter)

**Files:**
- Create: `src/ui/overlays/LevelCompleteOverlay.ts`
- Modify: `src/styles/overlays.css`

- [ ] **Step 1 : Implémenter**

```ts
// src/ui/overlays/LevelCompleteOverlay.ts
import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';

export interface LevelCompleteCallbacks {
  onContinue: () => void;
  onQuit: () => void;
}

export class LevelCompleteOverlay {
  readonly root: HTMLElement;

  constructor(callbacks: LevelCompleteCallbacks) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--levelcomplete';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="levelcomplete__card">
        <h2>Niveau terminé !</h2>
        <div class="levelcomplete__buttons">
          <button data-continue class="levelcomplete__btn levelcomplete__btn--continue">Continuer</button>
          <button data-quit class="levelcomplete__btn levelcomplete__btn--quit">Quitter la partie</button>
        </div>
      </div>
    `;
    (el.querySelector('[data-continue]') as HTMLButtonElement).onclick = callbacks.onContinue;
    (el.querySelector('[data-quit]') as HTMLButtonElement).onclick = callbacks.onQuit;
    this.root = el;
  }

  show(): void {
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
  }
  hide(): void {
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
```

- [ ] **Step 2 : CSS**

Ajouter à `overlays.css` :
```css
.overlay--levelcomplete {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(36, 48, 24, 0.6);
}
.levelcomplete__card {
  background: var(--color-bin-yellow, #c4d600); color: #243018;
  padding: 48px 64px; border-radius: 24px; text-align: center;
}
.levelcomplete__buttons { display: flex; gap: 24px; margin-top: 32px; }
.levelcomplete__btn { padding: 16px 32px; font-size: 22px; border: none; border-radius: 12px; cursor: pointer; }
.levelcomplete__btn--quit { background: #243018; color: #fff; }
```

- [ ] **Step 3 : Commit**

```bash
git add src/ui/overlays/LevelCompleteOverlay.ts src/styles/overlays.css
git commit -m "feat(ui): LevelCompleteOverlay (Continuer / Quitter)"
```

---

# Phase 5 — Orchestration, GameScreen multi-niveaux, idle, nettoyage

### Task 11 : `GameScreen` — multi-niveaux, remplissage poubelles, fin de niveau

**Files:**
- Modify: `src/ui/screens/GameScreen.ts`
- Modify: `src/render/GridRenderer.ts` (fond grille)

- [ ] **Step 1 : Fond de grille dans `GridRenderer`**

Dans le constructeur de `GridRenderer`, après `this.container.addChild(this.hitArea)`, ajouter un sprite de fond (sous les tuiles). Ajouter en tête : `import { Sprite } from 'pixi.js';` (déjà `Container, Graphics`). Ajouter une méthode :
```ts
  setBackground(texture: import('pixi.js').Texture): void {
    const { originX, originY, tileSize } = this.layout;
    const total = tileSize * this.level.size;
    const bg = new Sprite(texture);
    bg.x = originX; bg.y = originY; bg.width = total; bg.height = total;
    this.container.addChildAt(bg, 0);
  }
```

- [ ] **Step 2 : Réécrire `GameScreen`**

Points clés : reçoit `assets` (FileAssetProvider) ; construit HUD avec jauges ; à chaque step de cascade, incrémente les jauges (`this.hud.setFill(bin, bins[bin]/cap)`) et déclenche `edu.show(popupUrl)` pour les catégories spéciales (piles 1×/partie) ; à la fin, si `isLevelComplete` → callback `onLevelComplete()` ; sinon si `isOver` (grille bloquée) → `end.show()`. Les catégories spéciales utilisent l'effet vortex existant ; les catégories poubelle volent vers... la HUD (ou conservent l'animation `flyTileToBin` vers la zone menu). Voir code complet :

```ts
// src/ui/screens/GameScreen.ts
import { gsap } from 'gsap';
import { Container } from 'pixi.js';
import type { PixiApp } from '@/render/PixiApp';
import type { AssetProvider } from '@/assets/AssetProvider';
import { GridRenderer } from '@/render/GridRenderer';
import { flyTileToBin } from '@/render/FlightAnimator';
import { trapVortex } from '@/render/TrapEffect';
import { HUD } from '@/ui/HUD';
import { EduOverlay } from '@/ui/overlays/EduOverlay';
import { EndOverlay } from '@/ui/overlays/EndOverlay';
import { LevelCompleteOverlay } from '@/ui/overlays/LevelCompleteOverlay';
import { InputRouter } from '@/input/InputRouter';
import { applySwap, createGameState, isLevelComplete, type GameState } from '@/game/GameState';
import { getLevelConfig } from '@/game/levels';
import { createPrng } from '@/game/prng';
import { WASTE_META } from '@/game/waste-data';
import { isSpecialCategory, BIN_CATEGORIES, type BinCategory, type SpecialCategory } from '@/game/config-loader';
import { MENU_WIDTH, STAGE_HEIGHT } from '@/app/config';

export interface GameScreenCallbacks {
  onHome: () => void;
  onQuit: () => void;          // → Média
  onLevelComplete: () => void; // niveaux 1&2 → fenêtre ; niveau 3 → Média (géré par App)
}

const BIN_HUD_Y: Record<BinCategory, number> = {
  yellow: STAGE_HEIGHT * 0.30,
  black: STAGE_HEIGHT * 0.52,
  orange: STAGE_HEIGHT * 0.74,
};

export class GameScreen {
  readonly root: HTMLElement;
  readonly pixiContainer: Container;
  private state: GameState;
  private grid: GridRenderer;
  private hud: HUD;
  private edu: EduOverlay;
  private end: EndOverlay;
  private input: InputRouter;
  private prng: ReturnType<typeof createPrng>;
  private animating = false;
  private finished = false;

  constructor(
    private readonly pixi: PixiApp,
    private readonly assets: AssetProvider,
    level: 1 | 2 | 3,
    private readonly pilesShownRef: { value: boolean }, // partagé sur toute la partie
    private readonly callbacks: GameScreenCallbacks,
  ) {
    this.prng = createPrng((level * 2654435761) >>> 0);
    this.state = createGameState(getLevelConfig(level), this.prng);

    this.pixiContainer = new Container();
    this.grid = new GridRenderer(this.state.config, assets);
    this.grid.setBackground(assets.getTileTexture ? assets.getBinPleineTexture('yellow') : assets.getBinPleineTexture('yellow'));
    // fond réel :
    // this.grid.setBackground((assets as any).getGridTexture?.(level));
    this.grid.populate(this.state.grid);
    this.pixiContainer.addChild(this.grid.container);

    this.hud = new HUD(level, assets, assets.getButtonUrl('home'), assets.getButtonUrl('quitter'), {
      onHome: () => callbacks.onHome(),
      onQuit: () => callbacks.onQuit(),
    });
    this.edu = new EduOverlay();
    this.end = new EndOverlay(assets.getPopupUrl('combinaison'), () => callbacks.onQuit());

    const el = document.createElement('section');
    el.className = 'screen screen--game';
    el.style.opacity = '1';
    el.style.background = 'transparent';
    el.style.pointerEvents = 'none';
    el.appendChild(this.hud.root);

    const playArea = document.createElement('div');
    playArea.style.cssText = `position:absolute;left:${MENU_WIDTH}px;top:0;width:${1920 - MENU_WIDTH}px;height:${STAGE_HEIGHT}px;pointer-events:none;`;
    playArea.appendChild(this.edu.root);
    playArea.appendChild(this.end.root);
    el.appendChild(playArea);
    this.root = el;

    this.input = new InputRouter(this.grid);
    this.input.onSwap((intent) => this.handleSwap(intent.a, intent.b));

    this.pixi.gridLayer.addChild(this.pixiContainer);
    this.pixi.app.canvas.style.pointerEvents = 'auto';
  }

  private popupFor(cat: SpecialCategory): string {
    return this.assets.getPopupUrl(cat);
  }

  private maybeShowSpecial(specials: SpecialCategory[]): void {
    for (const cat of specials) {
      if (cat === 'piles') {
        if (this.pilesShownRef.value) continue;
        this.pilesShownRef.value = true;
      }
      this.edu.show(this.popupFor(cat));
      return; // un message à la fois
    }
  }

  private refreshGauges(): void {
    for (const bin of BIN_CATEGORIES) {
      this.hud.setFill(bin, this.state.bins[bin] / this.state.config.binCapacity[bin]);
    }
  }

  private async handleSwap(a: import('@/game/grid').Pos, b: import('@/game/grid').Pos): Promise<void> {
    if (this.animating || this.state.isOver || this.finished) return;
    if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) !== 1) return;

    this.animating = true;
    this.input.setEnabled(false);

    const result = applySwap(this.state, a, b, this.prng);
    if (result.kind === 'invalid') {
      await this.grid.swapAndUndo(a, b).then();
      this.animating = false; this.input.setEnabled(true);
      return;
    }

    await this.grid.swapVisual(a, b).then();
    this.grid.applySwapInModel(a, b);

    for (const event of result.events) {
      const tl = gsap.timeline();
      for (const m of event.step.matches) {
        const cat = WASTE_META[m.type]!.category;
        const sprites = this.grid.removeTilesAt(m.cells);
        if (isSpecialCategory(cat)) {
          for (const s of sprites) tl.add(trapVortex(s), 0);
        } else {
          const target = { x: MENU_WIDTH * 0.5, y: BIN_HUD_Y[cat as BinCategory] };
          for (const s of sprites) tl.add(flyTileToBin(s, target), 0);
        }
      }
      await tl.then();
      await this.grid.applyDrops(event.step.drops).then();
      await this.grid.applyRefill(event.step.refill).then();
      this.maybeShowSpecial(event.specials);
    }

    this.state = result.next;
    this.refreshGauges();
    this.animating = false;
    this.input.setEnabled(true);

    if (isLevelComplete(this.state) && !this.finished) {
      this.finished = true;
      this.input.setEnabled(false);
      this.callbacks.onLevelComplete();
    } else if (this.state.isOver && !this.finished) {
      this.finished = true;
      this.end.show();
    }
  }

  destroy(): void {
    this.pixi.gridLayer.removeChild(this.pixiContainer);
    this.pixiContainer.destroy({ children: true });
    this.hud.destroy();
    this.root.remove();
    this.pixi.app.canvas.style.pointerEvents = 'none';
  }
}
```

- [ ] **Step 3 : Ajouter `getGridTexture` à l'AssetProvider**

Le fond de grille a besoin d'une *Texture* (Pixi), pas d'une URL. Ajouter à l'interface + impls :
```ts
// AssetProvider.ts
getGridTexture(level: 1 | 2 | 3): Texture;
```
```ts
// FileAssetProvider.ts — dans init(), charger : for (const l of [1,2,3]) this.grids.set(l, await Assets.load(url(`grille/grille_niv${l}`)));
//   + champ private grids = new Map<number, Texture>(); + getter
getGridTexture(level: 1 | 2 | 3): Texture { return this.grids.get(level)!; }
```
```ts
// PlaceholderAssetProvider.ts — stub renvoyant une texture vide :
getGridTexture(): import('pixi.js').Texture { return Texture.EMPTY; }
```
Puis dans `GameScreen` constructeur, remplacer la ligne `setBackground(...)` provisoire par :
```ts
this.grid.setBackground(this.assets.getGridTexture(level));
```

- [ ] **Step 4 : Compilation**

Run: `npx tsc -b` — Expected: pas d'erreur (App sera mis à jour en Task 12).

- [ ] **Step 5 : Commit**

```bash
git add src/ui/screens/GameScreen.ts src/render/GridRenderer.ts src/assets/
git commit -m "feat(game): multi-level GameScreen with bin gauges, level-complete & special messages"
```

---

### Task 12 : `App` — orchestration Veille→Accueil→niveaux + idle 5 min

**Files:**
- Modify: `src/app/App.ts`
- Modify: `src/app/ScreenManager.ts` (clés d'écran)
- Modify: `src/app/config.ts`
- Modify: `src/input/IdleTracker.ts` (aucune logique, juste retrait usage screensaver)
- Modify: `src/ui/screens/EndMediaScreen.ts` (supprimer score)
- Delete: `src/render/ScreensaverScene.ts`, `src/ui/screens/ScreensaverScreen.ts`

- [ ] **Step 1 : `config.ts` — retirer IDLE_MS/EDU_OVERLAY_MS**

Retirer les lignes `export const IDLE_MS` et `export const EDU_OVERLAY_MS`. (Ces valeurs viennent désormais de `GAME_CONFIG.timings`.)

- [ ] **Step 2 : `ScreenManager` — nouvelles clés**

Changer `ScreenKey` :
```ts
export type ScreenKey = 'veille' | 'home' | 'game' | 'endmedia';
```
Supprimer `showScreensaver`/`exitScreensaver`/`previousNonScreensaver` (toute la logique screensaver). Garder `show`, `register`, `currentKey`.

- [ ] **Step 3 : `EndMediaScreen` — retirer score**

S'assurer qu'aucun paramètre score n'est utilisé (le composant actuel n'affiche pas de score → vérifier la signature `onReplay/onHome` toujours valable ; bouton « Rejouer » → Accueil).

- [ ] **Step 4 : Réécrire `App`**

```ts
// src/app/App.ts
import { PixiApp } from '@/render/PixiApp';
import { FileAssetProvider } from '@/assets/FileAssetProvider';
import { ScreenManager } from './ScreenManager';
import { VeilleScreen } from '@/ui/screens/VeilleScreen';
import { HomeScreen } from '@/ui/screens/HomeScreen';
import { EndMediaScreen } from '@/ui/screens/EndMediaScreen';
import { GameScreen } from '@/ui/screens/GameScreen';
import { LevelCompleteOverlay } from '@/ui/overlays/LevelCompleteOverlay';
import { IdleTracker } from '@/input/IdleTracker';
import { GAME_CONFIG } from '@/game/config-loader';

export class App {
  private pixi!: PixiApp;
  private assets!: FileAssetProvider;
  private screens!: ScreenManager;
  private idle!: IdleTracker;
  private currentGame: GameScreen | null = null;
  private currentLevel: 1 | 2 | 3 = 1;
  private pilesShownRef = { value: false };
  private levelComplete!: LevelCompleteOverlay;

  constructor(private readonly host: HTMLElement) {}

  async start(): Promise<void> {
    this.host.style.position = 'relative';
    this.host.style.width = '1920px';
    this.host.style.height = '1080px';
    this.host.style.overflow = 'hidden';

    this.pixi = await PixiApp.create();
    this.pixi.mount(this.host);

    this.assets = new FileAssetProvider();
    await this.assets.init();

    this.screens = new ScreenManager(this.host);

    const veille = new VeilleScreen(this.assets.getScreenImageUrl('veille'), this.assets.getButtonUrl('touchez'), {
      onStart: () => this.goHome(),
    });
    const home = new HomeScreen(this.assets.getScreenImageUrl('home'), this.assets.getButtonUrl('commencer'), {
      onStart: () => this.startNewGame(),
    });
    const endmedia = new EndMediaScreen({
      onReplay: () => this.goHome(),
      onHome: () => this.goHome(),
    });

    this.screens.register('veille', veille.root);
    this.screens.register('home', home.root);
    this.screens.register('endmedia', endmedia.root);

    this.levelComplete = new LevelCompleteOverlay({
      onContinue: () => this.continueNextLevel(),
      onQuit: () => this.goMedia(),
    });
    this.host.appendChild(this.levelComplete.root);

    this.screens.show('veille');

    this.idle = new IdleTracker(GAME_CONFIG.timings.idleReturnToHomeMs);
    this.idle.onIdle(() => this.onIdleTimeout());
    this.idle.start();
  }

  private onIdleTimeout(): void {
    const key = this.screens.currentKey();
    if (key === 'game' || key === 'endmedia') this.goHome();
  }

  private startNewGame(): void {
    this.pilesShownRef = { value: false };
    this.currentLevel = 1;
    this.startLevel(1);
  }

  private continueNextLevel(): void {
    this.levelComplete.hide();
    const next = (this.currentLevel + 1) as 1 | 2 | 3;
    this.currentLevel = next;
    this.startLevel(next);
  }

  private startLevel(level: 1 | 2 | 3): void {
    this.disposeCurrentGame();
    const game = new GameScreen(this.pixi, this.assets, level, this.pilesShownRef, {
      onHome: () => this.goHome(),
      onQuit: () => this.goMedia(),
      onLevelComplete: () => this.onLevelComplete(level),
    });
    this.screens.register('game', game.root);
    this.screens.show('game');
    this.currentGame = game;
  }

  private onLevelComplete(level: 1 | 2 | 3): void {
    if (level >= 3) { this.goMedia(); return; }
    this.levelComplete.show();
  }

  private goHome(): void {
    this.levelComplete.hide();
    this.disposeCurrentGame();
    this.screens.show('home');
    this.idle.reset();
  }

  private goMedia(): void {
    this.levelComplete.hide();
    this.disposeCurrentGame();
    this.screens.show('endmedia');
    this.idle.reset();
  }

  private disposeCurrentGame(): void {
    if (this.currentGame) { this.currentGame.destroy(); this.currentGame = null; }
  }
}
```

- [ ] **Step 5 : Supprimer les fichiers screensaver**

```bash
git rm src/render/ScreensaverScene.ts src/ui/screens/ScreensaverScreen.ts
```
Retirer toute référence à `screensaverLayer` si plus utilisée (laisser le layer dans `PixiApp` est sans danger ; sinon nettoyer).

- [ ] **Step 6 : Compilation + tests**

Run: `npx tsc -b && npm test`
Expected: build OK, tous les tests PASS.

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat(app): Veille→Accueil→levels flow, level-complete window, 5min idle→Accueil, remove screensaver"
```

---

### Task 13 : Vérification manuelle en localhost

**Files:** aucun (vérification).

- [ ] **Step 1 : Lancer le serveur**

Run: `npm run dev` (port 5180).

- [ ] **Step 2 : Checklist manuelle**

Vérifier dans le navigateur (`http://localhost:5180`) :
- [ ] Veille affiche `veille.png` + bouton « touchez » ; un clic → Accueil.
- [ ] Accueil affiche `home.png` (consignes + 3 poubelles) ; « Commencer » → niveau 1.
- [ ] HUD gauche : libellé niveau + 3 jauges-poubelles (pas de score), boutons Accueil/Quitter en image.
- [ ] Un match de catégorie poubelle fait monter la jauge correspondante.
- [ ] Un match « piles » : message piles s'affiche **une seule fois** dans la partie, avec croix × (ferme au clic) + fermeture auto.
- [ ] Quand les 3 jauges sont pleines (niveau 1) → fenêtre « Niveau terminé » : Continuer → niveau 2 ; Quitter → écran Média.
- [ ] Fin niveau 3 (3 jauges pleines) → Média lancé automatiquement (pas de fenêtre).
- [ ] « Plus aucune combinaison possible » : overlay `combinaison.png` avec croix + Quitter → Média.
- [ ] Inactivité 5 min en partie → retour Accueil. (Pour tester rapidement, abaisser temporairement `idleReturnToHomeMs` à `10000` dans `game_configs.json`, vérifier, puis remettre `300000`.)

- [ ] **Step 3 : Commit final (si ajustements)**

```bash
git add -A
git commit -m "fix: manual-test adjustments for game flow & assets"
```

---

## Self-review (couverture spec)

- §2 flux Veille→Accueil→niveaux→Média : Tasks 6,7,12 ✓
- §2 inactivité 5min→Accueil, suppression screensaver : Task 12 ✓
- §3 catégories + remplissage poubelles + fin de niveau : Tasks 1–4, 10, 11 ✓
- §4 suppression score (HUD, EndOverlay, EndMedia, module) : Tasks 4, 8, 9, 12 ✓
- §5 message piles 1×/partie + croix + auto-close : Tasks 9, 11 ✓
- §6 game_configs.json + data-driven : Tasks 1–3 ✓
- §7 intégration assets (FileAssetProvider + écrans + grille + poubelles + pop-ups) : Tasks 5, 6, 7, 8, 11 ✓

**Note résiduelle :** dans `GameScreen` Task 11 Step 2, la ligne `setBackground` provisoire est remplacée proprement au Step 3 (utiliser `getGridTexture`). Ne pas laisser la version provisoire.
