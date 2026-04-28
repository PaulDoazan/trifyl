# Trifyl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Trifyl Match-3 educational kiosk game (1920×1080 fixed) per the spec at `docs/superpowers/specs/2026-04-26-trifyl-game-design.md`.

**Architecture:** Layered Hybrid — pure TypeScript game logic in `src/game/` (no rendering deps, fully unit-tested), PixiJS v8 canvas for the grid/bins/animations, DOM for menus/overlays/screens, GSAP for both, glued together by `App.ts` + `ScreenManager.ts`.

**Tech Stack:** TypeScript (strict), PixiJS v8, GSAP, Vite, Vitest. CSS vanilla with custom properties. No UI framework.

---

## Execution order rationale

Phase A bootstraps the toolchain so every later task can run `npm test` / `npm run dev`.
Phase B writes the entire pure game logic with TDD — by the end, you can play a full game in unit tests.
Phase C wraps assets behind an interface so phases D/E can render without committing to real PNGs.
Phase D builds Pixi rendering on top of working logic.
Phase E builds DOM UI in parallel-style (each screen self-contained).
Phase F wires everything via `App.ts` + `ScreenManager.ts` and verifies the full flow manually.

---

## File responsibility map

```
src/
├── main.ts                       Entry; instantiates App and mounts to #app.
├── app/
│   ├── App.ts                    Top-level: owns ScreenManager, AssetProvider, IdleTracker, PixiApp.
│   ├── ScreenManager.ts          Switches between welcome/game/screensaver/end screens with cross-fade.
│   ├── config.ts                 Constants: STAGE_WIDTH=1920, STAGE_HEIGHT=1080, MENU_WIDTH=528, IDLE_MS=60000, etc.
│   └── animation-config.ts       GSAP duration/ease tokens (SWAP_MS, FLIGHT_MS, CASCADE_DROP_MS, ...).
├── game/                         Pure logic; zero Pixi/DOM imports.
│   ├── prng.ts                   Mulberry32 seeded PRNG.
│   ├── waste.ts                  WasteType, BinKind type aliases.
│   ├── waste-data.ts             WasteMeta dictionary (label, bin, educationalText, asset).
│   ├── levels.ts                 LEVEL_1, LEVEL_2, LEVEL_3 configs.
│   ├── grid.ts                   createEmptyGrid, swap, in-bounds checks, deep clone.
│   ├── matching.ts               findMatches, isValidSwap, findValidMoves.
│   ├── cascade.ts                applyGravity, refill, applyCascade.
│   ├── score.ts                  computeMatchScore (size + traps + cascade multiplier).
│   ├── initial-grid.ts           createInitialGrid (no match + at least one valid move).
│   └── GameState.ts              Container + reducer: applySwap returns next state + animation events.
├── assets/
│   ├── AssetProvider.ts          Interface: getTileTexture(WasteType), getBinFrames(BinKind), getBinIdle(BinKind).
│   ├── PlaceholderAssetProvider.ts Implementation using Pixi.Graphics renderTexture.
│   └── shapes.ts                 Pure draw helpers (drawBottle, drawApple, ...) returning Graphics.
├── render/
│   ├── PixiApp.ts                Pixi.Application bootstrap, root layout containers.
│   ├── TileSprite.ts             Sprite wrapper holding (row,col) + WasteType, position helpers.
│   ├── GridRenderer.ts           Owns the tile grid; play(events) translates GameState events to tweens.
│   ├── BinRenderer.ts            One bac (yellow/black/orange) with idle bob + open/close anim.
│   ├── FlightAnimator.ts         Vol parabolique tuile → bac.
│   ├── TrapEffect.ts             Tourbillon piège.
│   └── ScreensaverScene.ts       Pixi-only scene: déchets qui tombent et se trient.
├── input/
│   ├── DragInput.ts              Pointer drag → SwapIntent emitter (threshold 30% tile width).
│   ├── TapInput.ts               Tap-tap mode → SwapIntent emitter; tracks selected tile.
│   ├── InputRouter.ts            Combines drag + tap; one swap intent stream.
│   └── IdleTracker.ts            Resets on any pointerdown; fires onIdle after 60s.
├── ui/
│   ├── HUD.ts                    Score + Niveau live updates.
│   ├── overlays/
│   │   ├── EduOverlay.ts         Bottom: shown 4-5s after trap match.
│   │   └── EndOverlay.ts         Top: "Plus de combinaisons possibles" + "Voir le résultat".
│   └── screens/
│       ├── WelcomeScreen.ts      "Es-tu un serial trieur ?" + 3 level buttons.
│       ├── ScreensaverScreen.ts  Hosts ScreensaverScene, exits on pointerdown.
│       └── EndMediaScreen.ts     <video> placeholder + Rejouer/Home buttons.
└── styles/
    ├── reset.css                 Modern reset.
    ├── theme.css                 :root {--color-* ...} per spec §10.
    ├── menu.css                  Left menu (528×1080) gradient + bin labels + footer buttons.
    ├── overlays.css              EduOverlay, EndOverlay.
    ├── screens.css               Welcome, EndMedia, Screensaver layouts.
    └── animations.css            DOM keyframes (used by GSAP only when needed).

tests/
├── prng.test.ts
├── waste-data.test.ts
├── levels.test.ts
├── grid.test.ts
├── matching.test.ts
├── initial-grid.test.ts
├── cascade.test.ts
├── score.test.ts
└── game-state.test.ts

index.html, vite.config.ts, vitest.config.ts, tsconfig.json, package.json, README.md
```

---

# Phase A — Bootstrap

## Task A1: Initialize package + dev tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore` (extend existing)
- Create: `index.html`
- Create: `src/main.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "trifyl",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "gsap": "^3.12.5",
    "pixi.js": "^8.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "useDefineForClassFields": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173, host: '0.0.0.0' },
});
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Append to `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.log
.vite/
coverage/
```

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920,initial-scale=1,user-scalable=no" />
    <title>Trifyl</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Write a placeholder `src/main.ts`**

```ts
const root = document.getElementById('app');
if (root) root.textContent = 'Trifyl bootstrapping...';
```

- [ ] **Step 8: Install + verify**

Run: `npm install && npm run build && npm test`
Expected: build succeeds (empty test suite ok in vitest with `passWithNoTests`-style — if it errors, add `--passWithNoTests` to the test script).

If `vitest run` errors on no tests, change the script to `"test": "vitest run --passWithNoTests"`.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts .gitignore index.html src/main.ts
git commit -m "chore: bootstrap Vite + TS + Vitest project scaffolding"
```

---

## Task A2: Styles foundation

**Files:**
- Create: `src/styles/reset.css`
- Create: `src/styles/theme.css`

- [ ] **Step 1: Write `src/styles/reset.css`**

```css
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }
html, body, #app { width: 100%; height: 100%; overflow: hidden; }
body { font-family: var(--font-body); color: var(--color-text); background: var(--color-bg); }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
img, video, canvas { display: block; max-width: 100%; }
:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 2px; }
```

- [ ] **Step 2: Write `src/styles/theme.css`**

```css
:root {
  --color-bg: #F0FAF0;
  --color-menu-from: #2EB872;
  --color-menu-to: #1A8F4F;
  --color-menu-text: #FFFFFF;
  --color-bin-yellow: #FFD93D;
  --color-bin-black: #2C2C2C;
  --color-bin-orange: #FF7847;
  --color-accent: #4D96FF;
  --color-success: #6BCB77;
  --color-warning: #FFA726;
  --color-text: #1F2A20;

  --font-body: 'Inter', system-ui, -apple-system, sans-serif;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --shadow-soft: 0 6px 20px rgba(0, 0, 0, 0.12);

  --stage-w: 1920px;
  --stage-h: 1080px;
  --menu-w: 528px;
}
```

- [ ] **Step 3: Import styles from `src/main.ts`**

Edit `src/main.ts`:

```ts
import './styles/reset.css';
import './styles/theme.css';

const root = document.getElementById('app');
if (root) root.textContent = 'Trifyl bootstrapping...';
```

- [ ] **Step 4: Verify**

Run: `npm run dev`
Expected: page loads, body uses `--color-bg` background.

- [ ] **Step 5: Commit**

```bash
git add src/styles/ src/main.ts
git commit -m "style: add reset and theme CSS variables (Playful Flat palette)"
```

---

# Phase B — Pure game logic (TDD)

> Every task in this phase: write failing test → minimal implementation → verify → commit.

## Task B1: Seeded PRNG

**Files:**
- Create: `src/game/prng.ts`
- Test: `tests/prng.test.ts`

- [ ] **Step 1: Write failing test**

`tests/prng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createPrng } from '@/game/prng';

describe('createPrng', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const r = createPrng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('intRange is uniform over [min, max]', () => {
    const r = createPrng(1);
    const counts = new Map<number, number>();
    for (let i = 0; i < 6000; i++) {
      const v = r.intRange(0, 5);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (let v = 0; v <= 5; v++) {
      const c = counts.get(v) ?? 0;
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });

  it('pick selects from array', () => {
    const r = createPrng(3);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(r.pick(arr));
    }
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/game/prng.ts`**

```ts
export interface Prng {
  next(): number;                              // [0, 1)
  intRange(min: number, max: number): number;  // inclusive both ends
  pick<T>(arr: readonly T[]): T;
}

export function createPrng(seed: number): Prng {
  let state = seed >>> 0;
  if (state === 0) state = 0x9E3779B9;

  const next = (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    intRange(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error('pick from empty array');
      return arr[Math.floor(next() * arr.length)]!;
    },
  };
}
```

- [ ] **Step 4: Verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/prng.ts tests/prng.test.ts
git commit -m "feat(game): seeded PRNG (mulberry32) with intRange and pick"
```

---

## Task B2: Waste types and metadata

**Files:**
- Create: `src/game/waste.ts`
- Create: `src/game/waste-data.ts`
- Test: `tests/waste-data.test.ts`

- [ ] **Step 1: Write failing test**

`tests/waste-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ALL_WASTE_TYPES, WASTE_META } from '@/game/waste-data';

describe('waste-data', () => {
  it('every WasteType has metadata', () => {
    for (const t of ALL_WASTE_TYPES) {
      const meta = WASTE_META[t];
      expect(meta, `missing meta for ${t}`).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.asset.length).toBeGreaterThan(0);
    }
  });

  it('hazardous wastes have educationalText, others do not', () => {
    for (const t of ALL_WASTE_TYPES) {
      const meta = WASTE_META[t];
      if (meta.bin === 'hazardous') {
        expect(meta.educationalText).toBeDefined();
        expect(meta.educationalText!.length).toBeGreaterThan(0);
      } else {
        expect(meta.educationalText).toBeUndefined();
      }
    }
  });

  it('mapping is consistent: yellow=recyclables, black=residual, orange=biodéchets, hazardous=déchèterie', () => {
    expect(WASTE_META.plastic_bottle.bin).toBe('yellow');
    expect(WASTE_META.tissue.bin).toBe('black');
    expect(WASTE_META.apple.bin).toBe('orange');
    expect(WASTE_META.battery.bin).toBe('hazardous');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/game/waste.ts`**

```ts
export type BinKind = 'yellow' | 'black' | 'orange' | 'hazardous';

export type WasteType =
  | 'plastic_bottle' | 'can' | 'cardboard' | 'milk_carton'
  | 'dirty_yogurt_pot' | 'tissue' | 'broken_toy'
  | 'apple' | 'coffee_grounds' | 'egg_shell'
  | 'battery' | 'lightbulb' | 'medication';

export interface WasteMeta {
  type: WasteType;
  bin: BinKind;
  label: string;
  educationalText?: string;
  asset: string;
}
```

- [ ] **Step 4: Implement `src/game/waste-data.ts`**

```ts
import type { WasteMeta, WasteType } from './waste';

export const ALL_WASTE_TYPES: readonly WasteType[] = [
  'plastic_bottle', 'can', 'cardboard', 'milk_carton',
  'dirty_yogurt_pot', 'tissue', 'broken_toy',
  'apple', 'coffee_grounds', 'egg_shell',
  'battery', 'lightbulb', 'medication',
];

export const WASTE_META: Record<WasteType, WasteMeta> = {
  plastic_bottle:   { type: 'plastic_bottle',   bin: 'yellow', label: 'Bouteille plastique', asset: 'tile/plastic_bottle' },
  can:              { type: 'can',              bin: 'yellow', label: 'Canette',             asset: 'tile/can' },
  cardboard:        { type: 'cardboard',        bin: 'yellow', label: 'Carton',              asset: 'tile/cardboard' },
  milk_carton:      { type: 'milk_carton',      bin: 'yellow', label: 'Brique de lait',      asset: 'tile/milk_carton' },

  dirty_yogurt_pot: { type: 'dirty_yogurt_pot', bin: 'black',  label: 'Pot de yaourt sale',  asset: 'tile/dirty_yogurt_pot' },
  tissue:           { type: 'tissue',           bin: 'black',  label: 'Mouchoir',            asset: 'tile/tissue' },
  broken_toy:       { type: 'broken_toy',       bin: 'black',  label: 'Jouet cassé',         asset: 'tile/broken_toy' },

  apple:            { type: 'apple',            bin: 'orange', label: 'Pomme',               asset: 'tile/apple' },
  coffee_grounds:   { type: 'coffee_grounds',   bin: 'orange', label: 'Marc de café',        asset: 'tile/coffee_grounds' },
  egg_shell:        { type: 'egg_shell',        bin: 'orange', label: "Coquille d'œuf",      asset: 'tile/egg_shell' },

  battery: {
    type: 'battery', bin: 'hazardous', label: 'Pile',
    asset: 'tile/battery',
    educationalText: "Les piles sont des déchets dangereux : elles contiennent des métaux lourds. À déposer en déchèterie ou dans un point de collecte dédié, jamais dans les bacs ménagers.",
  },
  lightbulb: {
    type: 'lightbulb', bin: 'hazardous', label: 'Ampoule',
    asset: 'tile/lightbulb',
    educationalText: "Les ampoules basse consommation et LED contiennent des composants à recycler. À déposer en déchèterie ou dans un point de collecte en magasin.",
  },
  medication: {
    type: 'medication', bin: 'hazardous', label: 'Médicament',
    asset: 'tile/medication',
    educationalText: "Les médicaments périmés ou non utilisés se rapportent en pharmacie (Cyclamed), jamais dans les ordures ménagères ni les toilettes.",
  },
};
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/waste.ts src/game/waste-data.ts tests/waste-data.test.ts
git commit -m "feat(game): WasteType, BinKind, and waste metadata table"
```

---

## Task B3: Level configurations

**Files:**
- Create: `src/game/levels.ts`
- Test: `tests/levels.test.ts`

- [ ] **Step 1: Write failing test**

`tests/levels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LEVEL_1, LEVEL_2, LEVEL_3, getLevelConfig } from '@/game/levels';
import { WASTE_META } from '@/game/waste-data';

describe('level configs', () => {
  it('grid sizes per spec', () => {
    expect(LEVEL_1.size).toBe(5);
    expect(LEVEL_2.size).toBe(10);
    expect(LEVEL_3.size).toBe(15);
  });

  it('every trapType is included in wasteTypes', () => {
    for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
      for (const t of lvl.trapTypes) {
        expect(lvl.wasteTypes).toContain(t);
      }
    }
  });

  it('every trapType is hazardous in WASTE_META', () => {
    for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
      for (const t of lvl.trapTypes) {
        expect(WASTE_META[t].bin).toBe('hazardous');
      }
    }
  });

  it('every level has at least 4 waste types (so matches stay possible after shuffle)', () => {
    for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
      expect(lvl.wasteTypes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('getLevelConfig returns correct config', () => {
    expect(getLevelConfig(1)).toBe(LEVEL_1);
    expect(getLevelConfig(2)).toBe(LEVEL_2);
    expect(getLevelConfig(3)).toBe(LEVEL_3);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- levels`
Expected: FAIL.

- [ ] **Step 3: Implement `src/game/levels.ts`**

```ts
import type { WasteType } from './waste';

export interface LevelConfig {
  level: 1 | 2 | 3;
  size: 5 | 10 | 15;
  wasteTypes: WasteType[];
  trapTypes: WasteType[];
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
```

- [ ] **Step 4: Verify, commit**

```bash
npm test -- levels
git add src/game/levels.ts tests/levels.test.ts
git commit -m "feat(game): three level configurations with trap subsets"
```

---

## Task B4: Grid primitives

**Files:**
- Create: `src/game/grid.ts`
- Test: `tests/grid.test.ts`

- [ ] **Step 1: Write failing test**

`tests/grid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid, cloneGrid, inBounds, areAdjacent, swapCells, getCell, setCell,
} from '@/game/grid';

describe('grid', () => {
  it('createEmptyGrid yields rows×cols of nulls', () => {
    const g = createEmptyGrid(3, 4);
    expect(g.length).toBe(3);
    expect(g[0]!.length).toBe(4);
    for (const row of g) for (const c of row) expect(c).toBeNull();
  });

  it('inBounds covers edges and rejects outside', () => {
    expect(inBounds({ rows: 5, cols: 5 }, 0, 0)).toBe(true);
    expect(inBounds({ rows: 5, cols: 5 }, 4, 4)).toBe(true);
    expect(inBounds({ rows: 5, cols: 5 }, -1, 0)).toBe(false);
    expect(inBounds({ rows: 5, cols: 5 }, 5, 0)).toBe(false);
    expect(inBounds({ rows: 5, cols: 5 }, 0, 5)).toBe(false);
  });

  it('areAdjacent: only orthogonal direct neighbours', () => {
    expect(areAdjacent({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 0, col: 1 })).toBe(true);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(false);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(false);
    expect(areAdjacent({ row: 1, col: 1 }, { row: 1, col: 3 })).toBe(false);
  });

  it('swapCells swaps in place and is reversible', () => {
    const g = createEmptyGrid(2, 2);
    setCell(g, 0, 0, 'apple');
    setCell(g, 0, 1, 'tissue');
    swapCells(g, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(getCell(g, 0, 0)).toBe('tissue');
    expect(getCell(g, 0, 1)).toBe('apple');
    swapCells(g, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(getCell(g, 0, 0)).toBe('apple');
  });

  it('cloneGrid is a deep copy', () => {
    const g = createEmptyGrid(2, 2);
    setCell(g, 0, 0, 'apple');
    const c = cloneGrid(g);
    setCell(c, 0, 0, 'tissue');
    expect(getCell(g, 0, 0)).toBe('apple');
    expect(getCell(c, 0, 0)).toBe('tissue');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- grid`
Expected: FAIL.

- [ ] **Step 3: Implement `src/game/grid.ts`**

```ts
import type { WasteType } from './waste';

export type Cell = WasteType | null;
export type Grid = Cell[][];

export interface Pos { row: number; col: number; }
export interface Bounds { rows: number; cols: number; }

export function createEmptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null as Cell));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

export function inBounds(b: Bounds, row: number, col: number): boolean {
  return row >= 0 && row < b.rows && col >= 0 && col < b.cols;
}

export function getCell(g: Grid, row: number, col: number): Cell {
  return g[row]?.[col] ?? null;
}

export function setCell(g: Grid, row: number, col: number, value: Cell): void {
  const r = g[row];
  if (!r) throw new Error(`row ${row} out of bounds`);
  r[col] = value;
}

export function areAdjacent(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function swapCells(g: Grid, a: Pos, b: Pos): void {
  const va = getCell(g, a.row, a.col);
  const vb = getCell(g, b.row, b.col);
  setCell(g, a.row, a.col, vb);
  setCell(g, b.row, b.col, va);
}
```

- [ ] **Step 4: Verify, commit**

```bash
npm test -- grid
git add src/game/grid.ts tests/grid.test.ts
git commit -m "feat(game): grid primitives (create, clone, in-bounds, swap)"
```

---

## Task B5: Match detection + isValidSwap + findValidMoves

**Files:**
- Create: `src/game/matching.ts`
- Test: `tests/matching.test.ts`

- [ ] **Step 1: Write failing test**

`tests/matching.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findMatches, isValidSwap, findValidMoves } from '@/game/matching';
import type { Grid } from '@/game/grid';
import type { WasteType } from '@/game/waste';

const A: WasteType = 'apple';
const B: WasteType = 'tissue';
const C: WasteType = 'plastic_bottle';

const g = (rows: (WasteType | null)[][]): Grid => rows.map((r) => r.slice());

describe('findMatches', () => {
  it('returns empty when no match', () => {
    const board = g([
      [A, B, A],
      [B, A, B],
      [A, B, A],
    ]);
    expect(findMatches(board)).toEqual([]);
  });

  it('detects horizontal 3-match', () => {
    const board = g([
      [A, A, A],
      [B, C, B],
      [C, B, C],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    expect(m[0]!.type).toBe(A);
    expect(m[0]!.cells.length).toBe(3);
  });

  it('detects vertical 4-match', () => {
    const board = g([
      [A, B, C],
      [A, C, B],
      [A, B, C],
      [A, C, B],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    expect(m[0]!.cells.length).toBe(4);
  });

  it('merges overlapping horizontal+vertical (T/L cross)', () => {
    const board = g([
      [B, A, B],
      [B, A, B],
      [A, A, A],
    ]);
    const m = findMatches(board);
    expect(m).toHaveLength(1);
    const cells = m[0]!.cells;
    expect(cells.length).toBe(5);
  });
});

describe('isValidSwap', () => {
  it('false if not adjacent', () => {
    const board = g([
      [A, A, B],
      [B, B, A],
      [A, A, B],
    ]);
    expect(isValidSwap(board, { row: 0, col: 0 }, { row: 2, col: 2 })).toBe(false);
  });

  it('false if swap creates no match', () => {
    const board = g([
      [A, B, A],
      [B, A, B],
      [A, B, A],
    ]);
    expect(isValidSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });

  it('true if swap creates a match', () => {
    const board = g([
      [A, B, A],
      [A, A, B],
      [B, A, B],
    ]);
    expect(isValidSwap(board, { row: 0, col: 1 }, { row: 1, col: 1 })).toBe(true);
  });
});

describe('findValidMoves', () => {
  it('returns empty when no swap creates any match', () => {
    // 1×3 with 2 distinct types: only adjacent swaps are (0,0)↔(0,1) and (0,1)↔(0,2);
    // neither produces a 3-in-a-row in a 3-cell row, so no moves exist.
    const board = g([[A, B, A]]);
    expect(findValidMoves(board)).toEqual([]);
  });

  it('returns at least one move when one exists', () => {
    const board = g([
      [A, B, A],
      [A, A, B],
      [B, A, B],
    ]);
    const moves = findValidMoves(board);
    expect(moves.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- matching`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/game/matching.ts`**

```ts
import type { Cell, Grid, Pos } from './grid';
import { areAdjacent, cloneGrid, getCell, swapCells } from './grid';
import type { WasteType } from './waste';

export interface MatchGroup {
  type: WasteType;
  cells: Pos[];
}

export function findMatches(grid: Grid): MatchGroup[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return [];

  const flagged: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      const prev = getCell(grid, r, c - 1);
      const cur = c < cols ? getCell(grid, r, c) : null;
      const breakRun = prev === null || cur !== prev;
      if (breakRun) {
        const len = c - runStart;
        if (prev !== null && len >= 3) {
          for (let k = runStart; k < c; k++) flagged[r]![k] = true;
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      const prev = getCell(grid, r - 1, c);
      const cur = r < rows ? getCell(grid, r, c) : null;
      const breakRun = prev === null || cur !== prev;
      if (breakRun) {
        const len = r - runStart;
        if (prev !== null && len >= 3) {
          for (let k = runStart; k < r; k++) flagged[k]![c] = true;
        }
        runStart = r;
      }
    }
  }

  const visited: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const groups: MatchGroup[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!flagged[r]![c] || visited[r]![c]) continue;
      const type = getCell(grid, r, c) as WasteType;
      const cells: Pos[] = [];
      const stack: Pos[] = [{ row: r, col: c }];
      while (stack.length) {
        const p = stack.pop()!;
        if (!flagged[p.row]?.[p.col] || visited[p.row]![p.col]) continue;
        if (getCell(grid, p.row, p.col) !== type) continue;
        visited[p.row]![p.col] = true;
        cells.push(p);
        stack.push({ row: p.row + 1, col: p.col });
        stack.push({ row: p.row - 1, col: p.col });
        stack.push({ row: p.row, col: p.col + 1 });
        stack.push({ row: p.row, col: p.col - 1 });
      }
      groups.push({ type, cells });
    }
  }

  return groups;
}

export function isValidSwap(grid: Grid, a: Pos, b: Pos): boolean {
  if (!areAdjacent(a, b)) return false;
  const va = getCell(grid, a.row, a.col);
  const vb = getCell(grid, b.row, b.col);
  if (va === null || vb === null || va === vb) return false;
  const trial = cloneGrid(grid);
  swapCells(trial, a, b);
  return findMatches(trial).length > 0;
}

export interface ValidMove { a: Pos; b: Pos; }

export function findValidMoves(grid: Grid): ValidMove[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const moves: ValidMove[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const here: Pos = { row: r, col: c };
      const right: Pos = { row: r, col: c + 1 };
      const down: Pos = { row: r + 1, col: c };
      if (c + 1 < cols && isValidSwap(grid, here, right)) moves.push({ a: here, b: right });
      if (r + 1 < rows && isValidSwap(grid, here, down)) moves.push({ a: here, b: down });
    }
  }
  return moves;
}
```

- [ ] **Step 4: Verify, commit**

```bash
npm test -- matching
git add src/game/matching.ts tests/matching.test.ts
git commit -m "feat(game): match detection (rows/cols/cross), swap validation, valid-move enumeration"
```

---

## Task B6: Initial grid generation

**Files:**
- Create: `src/game/initial-grid.ts`
- Test: `tests/initial-grid.test.ts`

- [ ] **Step 1: Write failing test**

`tests/initial-grid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialGrid } from '@/game/initial-grid';
import { findMatches, findValidMoves } from '@/game/matching';
import { LEVEL_1, LEVEL_2, LEVEL_3 } from '@/game/levels';
import { createPrng } from '@/game/prng';

describe('createInitialGrid', () => {
  for (const lvl of [LEVEL_1, LEVEL_2, LEVEL_3]) {
    it(`level ${lvl.level}: no initial match, at least one valid move (10 seeds)`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const grid = createInitialGrid(lvl, createPrng(seed));
        expect(grid.length).toBe(lvl.size);
        expect(grid[0]!.length).toBe(lvl.size);
        expect(findMatches(grid)).toEqual([]);
        expect(findValidMoves(grid).length).toBeGreaterThan(0);
      }
    });

    it(`level ${lvl.level}: only uses configured wasteTypes`, () => {
      const grid = createInitialGrid(lvl, createPrng(42));
      const allowed = new Set(lvl.wasteTypes);
      for (const row of grid) for (const c of row) {
        expect(c).not.toBeNull();
        expect(allowed.has(c!)).toBe(true);
      }
    });
  }
});
```

- [ ] **Step 2: Run, expect fail.** `npm test -- initial-grid`

- [ ] **Step 3: Implement `src/game/initial-grid.ts`**

Strategy: fill cell-by-cell, picking from `wasteTypes` while avoiding any candidate that would create a 3-in-a-row with the two previous cells (left or above). After fill, verify at least one valid move exists; if not, retry up to N times with re-shuffles. (For sizes ≤ 15 with ≥ 4 distinct types this converges almost immediately.)

```ts
import type { LevelConfig } from './levels';
import type { Grid } from './grid';
import { createEmptyGrid, getCell, setCell } from './grid';
import { findValidMoves } from './matching';
import type { Prng } from './prng';
import type { WasteType } from './waste';

export function createInitialGrid(level: LevelConfig, prng: Prng): Grid {
  const MAX_ATTEMPTS = 100;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = fillNoMatch(level, prng);
    if (findValidMoves(grid).length > 0) return grid;
  }
  throw new Error(`createInitialGrid: failed to converge after ${MAX_ATTEMPTS} attempts for level ${level.level}`);
}

function fillNoMatch(level: LevelConfig, prng: Prng): Grid {
  const n = level.size;
  const grid = createEmptyGrid(n, n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const forbidden = new Set<WasteType>();
      if (c >= 2 && getCell(grid, r, c - 1) === getCell(grid, r, c - 2)) {
        const v = getCell(grid, r, c - 1);
        if (v !== null) forbidden.add(v);
      }
      if (r >= 2 && getCell(grid, r - 1, c) === getCell(grid, r - 2, c)) {
        const v = getCell(grid, r - 1, c);
        if (v !== null) forbidden.add(v);
      }
      const candidates = level.wasteTypes.filter((t) => !forbidden.has(t));
      const pick = candidates.length > 0
        ? candidates[prng.intRange(0, candidates.length - 1)]!
        : level.wasteTypes[prng.intRange(0, level.wasteTypes.length - 1)]!;
      setCell(grid, r, c, pick);
    }
  }
  return grid;
}
```

- [ ] **Step 4: Verify, commit**

```bash
npm test -- initial-grid
git add src/game/initial-grid.ts tests/initial-grid.test.ts
git commit -m "feat(game): generate initial grid with no matches and at least one valid move"
```

---

## Task B7: Cascade — gravity, refill, applyCascade

**Files:**
- Create: `src/game/cascade.ts`
- Test: `tests/cascade.test.ts`

- [ ] **Step 1: Write failing test**

`tests/cascade.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyGravity, refillTop, applyCascade } from '@/game/cascade';
import type { Grid } from '@/game/grid';
import type { WasteType } from '@/game/waste';
import { createPrng } from '@/game/prng';
import { LEVEL_1 } from '@/game/levels';

const A: WasteType = 'apple';
const B: WasteType = 'tissue';
const C: WasteType = 'plastic_bottle';
const D: WasteType = 'battery';

const g = (rows: (WasteType | null)[][]): Grid => rows.map((r) => r.slice());

describe('applyGravity', () => {
  it('drops cells over holes within each column', () => {
    const board = g([
      [A,    B, C],
      [null, B, C],
      [A,    null, C],
      [null, A, null],
    ]);
    const moves = applyGravity(board);
    expect(board[3]).toEqual([A, A, C]);
    expect(board[2]).toEqual([A, B, C]);
    expect(board[1]).toEqual([null, B, C]);
    expect(board[0]).toEqual([null, null, null]);
    expect(moves.length).toBeGreaterThan(0);
    // gravity invariants: every recorded move drops a cell down within the same column
    for (const m of moves) {
      expect(m.from.col).toBe(m.to.col);
      expect(m.from.row).toBeLessThan(m.to.row);
    }
  });
});

describe('refillTop', () => {
  it('fills nulls from the top with allowed waste types', () => {
    const board = g([
      [null, null, null],
      [null, B,    C],
      [A,    B,    C],
    ]);
    const additions = refillTop(board, LEVEL_1, createPrng(1));
    for (const row of board) for (const c of row) expect(c).not.toBeNull();
    const allowed = new Set(LEVEL_1.wasteTypes);
    for (const row of board) for (const c of row) expect(allowed.has(c!)).toBe(true);
    expect(additions.length).toBe(4);
  });
});

describe('applyCascade', () => {
  it('returns one cascade event per resolution and final stable grid has no matches', () => {
    const board = g([
      [A, B, C, D, A],
      [A, C, B, D, B],
      [B, A, A, A, C],
      [C, B, C, A, B],
      [D, A, B, C, A],
    ]);
    const result = applyCascade(board, LEVEL_1, createPrng(7));
    expect(result.events.length).toBeGreaterThanOrEqual(1);
    const last = board.flat();
    expect(last.every((c) => c !== null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail.** `npm test -- cascade`

- [ ] **Step 3: Implement `src/game/cascade.ts`**

```ts
import type { Cell, Grid, Pos } from './grid';
import { getCell, setCell } from './grid';
import { findMatches, type MatchGroup } from './matching';
import type { LevelConfig } from './levels';
import type { Prng } from './prng';
import type { WasteType } from './waste';

export interface DropMove {
  from: Pos;
  to: Pos;
  type: WasteType;
}

export interface RefillAddition {
  to: Pos;
  type: WasteType;
}

export function applyGravity(grid: Grid): DropMove[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const moves: DropMove[] = [];
  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      const cell = getCell(grid, r, c);
      if (cell !== null) {
        if (writeRow !== r) {
          setCell(grid, writeRow, c, cell);
          setCell(grid, r, c, null);
          moves.push({ from: { row: r, col: c }, to: { row: writeRow, col: c }, type: cell });
        }
        writeRow--;
      }
    }
  }
  return moves;
}

export function refillTop(grid: Grid, level: LevelConfig, prng: Prng): RefillAddition[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const additions: RefillAddition[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (getCell(grid, r, c) === null) {
        const type = level.wasteTypes[prng.intRange(0, level.wasteTypes.length - 1)]!;
        setCell(grid, r, c, type);
        additions.push({ to: { row: r, col: c }, type });
      }
    }
  }
  return additions;
}

export interface CascadeStep {
  matches: MatchGroup[];
  drops: DropMove[];
  refill: RefillAddition[];
  cascadeIndex: number;
}

export interface CascadeResult {
  events: CascadeStep[];
}

export function applyCascade(grid: Grid, level: LevelConfig, prng: Prng): CascadeResult {
  const events: CascadeStep[] = [];
  let cascadeIndex = 1;
  while (true) {
    const matches = findMatches(grid);
    if (matches.length === 0) break;
    for (const m of matches) {
      for (const cell of m.cells) setCell(grid, cell.row, cell.col, null as Cell);
    }
    const drops = applyGravity(grid);
    const refill = refillTop(grid, level, prng);
    events.push({ matches, drops, refill, cascadeIndex });
    cascadeIndex++;
  }
  return { events };
}
```

- [ ] **Step 4: Verify, commit**

```bash
npm test -- cascade
git add src/game/cascade.ts tests/cascade.test.ts
git commit -m "feat(game): gravity, top refill, and cascade resolution loop"
```

---

## Task B8: Score formula

**Files:**
- Create: `src/game/score.ts`
- Test: `tests/score.test.ts`

- [ ] **Step 1: Write failing test**

`tests/score.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '@/game/score';

describe('computeMatchScore', () => {
  it('match-3 base = 30', () => {
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 1 })).toBe(30);
  });
  it('match-4 base = 60, match-5 = 100, match-6+ = 150', () => {
    expect(computeMatchScore({ size: 4, hasTrap: false, cascadeIndex: 1 })).toBe(60);
    expect(computeMatchScore({ size: 5, hasTrap: false, cascadeIndex: 1 })).toBe(100);
    expect(computeMatchScore({ size: 6, hasTrap: false, cascadeIndex: 1 })).toBe(150);
    expect(computeMatchScore({ size: 8, hasTrap: false, cascadeIndex: 1 })).toBe(150);
  });
  it('trap doubles', () => {
    expect(computeMatchScore({ size: 3, hasTrap: true, cascadeIndex: 1 })).toBe(60);
  });
  it('cascade index multiplies', () => {
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 2 })).toBe(60);
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 3 })).toBe(90);
  });
  it('cascade caps at ×5', () => {
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 5 })).toBe(150);
    expect(computeMatchScore({ size: 3, hasTrap: false, cascadeIndex: 99 })).toBe(150);
  });
  it('trap and cascade compound', () => {
    expect(computeMatchScore({ size: 3, hasTrap: true, cascadeIndex: 3 })).toBe(180);
  });
});
```

- [ ] **Step 2: Run, expect fail.** `npm test -- score`

- [ ] **Step 3: Implement `src/game/score.ts`**

```ts
export interface ScoreInput {
  size: number;
  hasTrap: boolean;
  cascadeIndex: number;
}

export function computeMatchScore({ size, hasTrap, cascadeIndex }: ScoreInput): number {
  let base: number;
  if (size <= 3) base = 30;
  else if (size === 4) base = 60;
  else if (size === 5) base = 100;
  else base = 150;

  const trapMul = hasTrap ? 2 : 1;
  const cascadeMul = Math.min(Math.max(cascadeIndex, 1), 5);
  return base * trapMul * cascadeMul;
}
```

- [ ] **Step 4: Verify, commit**

```bash
npm test -- score
git add src/game/score.ts tests/score.test.ts
git commit -m "feat(game): score formula with trap and cascade multipliers (cap ×5)"
```

---

## Task B9: GameState container + reducer

**Files:**
- Create: `src/game/GameState.ts`
- Test: `tests/game-state.test.ts`

- [ ] **Step 1: Write failing test**

`tests/game-state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createGameState, applySwap } from '@/game/GameState';
import { LEVEL_1 } from '@/game/levels';
import { createPrng } from '@/game/prng';
import { findValidMoves } from '@/game/matching';

describe('GameState', () => {
  it('createGameState returns a playable state for level 1', () => {
    const s = createGameState(LEVEL_1, createPrng(123));
    expect(s.level).toBe(1);
    expect(s.score).toBe(0);
    expect(s.isOver).toBe(false);
    expect(s.grid.length).toBe(LEVEL_1.size);
  });

  it('applySwap on invalid swap returns kind=invalid, no state mutation', () => {
    const s = createGameState(LEVEL_1, createPrng(1));
    const initialScore = s.score;
    const moves = findValidMoves(s.grid);
    const invalidA = { row: 0, col: 0 };
    let invalidB = { row: 0, col: 1 };
    if (moves.some((m) => m.a.row === 0 && m.a.col === 0 && m.b.row === 0 && m.b.col === 1)) {
      invalidB = { row: 1, col: 0 };
    }
    const next = applySwap(s, invalidA, invalidB, createPrng(99));
    expect(next.kind).toBe('invalid');
    expect(s.score).toBe(initialScore);
  });

  it('applySwap on valid swap returns kind=resolved with cascade events and score >= 30', () => {
    let s = createGameState(LEVEL_1, createPrng(2));
    const moves = findValidMoves(s.grid);
    expect(moves.length).toBeGreaterThan(0);
    const m = moves[0]!;
    const result = applySwap(s, m.a, m.b, createPrng(2));
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.next.score).toBeGreaterThanOrEqual(30);
    }
  });

  it('isOver becomes true once no valid moves remain', () => {
    const s = createGameState(LEVEL_1, createPrng(1));
    expect(findValidMoves(s.grid).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, expect fail.** `npm test -- game-state`

- [ ] **Step 3: Implement `src/game/GameState.ts`**

```ts
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
```

- [ ] **Step 4: Verify, commit**

```bash
npm test
git add src/game/GameState.ts tests/game-state.test.ts
git commit -m "feat(game): GameState container with applySwap reducer (returns cascade events + new state)"
```

**Phase B exit criteria:** `npm test` passes all suites in <5s. Whole game logic is testable end-to-end.

---

# Phase C — Asset abstraction

## Task C1: AssetProvider interface + placeholder shapes

**Files:**
- Create: `src/assets/AssetProvider.ts`
- Create: `src/assets/shapes.ts`
- Create: `src/assets/PlaceholderAssetProvider.ts`

- [ ] **Step 1: Write `src/assets/AssetProvider.ts`**

```ts
import type { Texture } from 'pixi.js';
import type { BinKind, WasteType } from '@/game/waste';

export interface AssetProvider {
  init(): Promise<void>;
  getTileTexture(type: WasteType): Texture;
  getBinIdleTexture(bin: Exclude<BinKind, 'hazardous'>): Texture;
  getBinOpenFrames(bin: Exclude<BinKind, 'hazardous'>): Texture[];
}
```

- [ ] **Step 2: Write `src/assets/shapes.ts`**

Pure draw helpers that take a `Graphics` and return it filled with a stylized placeholder for each waste type. One function per type (or a single switch). Use the bin's color as the fill, with a small detail (e.g. label initial) drawn in `Pixi.Text`. For brevity, here is a representative subset; the full file follows the same template for every WasteType.

```ts
import { Graphics, Text, Container, type Renderer, RenderTexture } from 'pixi.js';
import type { WasteType, BinKind } from '@/game/waste';
import { WASTE_META } from '@/game/waste-data';

const BIN_COLORS: Record<BinKind, number> = {
  yellow: 0xFFD93D,
  black: 0x2C2C2C,
  orange: 0xFF7847,
  hazardous: 0xFFA726,
};

export function buildTilePlaceholder(type: WasteType, size: number): Container {
  const meta = WASTE_META[type];
  const c = new Container();
  const bg = new Graphics();
  bg.roundRect(0, 0, size, size, size * 0.18).fill(BIN_COLORS[meta.bin]);
  bg.roundRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84, size * 0.14).stroke({ color: 0xffffff, width: 3, alpha: 0.5 });
  c.addChild(bg);

  const label = new Text({
    text: shortLabel(type),
    style: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: Math.max(14, size * 0.28),
      fontWeight: '700',
      fill: meta.bin === 'yellow' ? 0x1F2A20 : 0xFFFFFF,
      align: 'center',
    },
  });
  label.anchor.set(0.5);
  label.x = size / 2;
  label.y = size / 2;
  c.addChild(label);
  return c;
}

function shortLabel(type: WasteType): string {
  switch (type) {
    case 'plastic_bottle': return 'BTL';
    case 'can': return 'CAN';
    case 'cardboard': return 'CRT';
    case 'milk_carton': return 'LAIT';
    case 'dirty_yogurt_pot': return 'YGT';
    case 'tissue': return 'MCH';
    case 'broken_toy': return 'JOU';
    case 'apple': return 'POM';
    case 'coffee_grounds': return 'CAF';
    case 'egg_shell': return 'OEUF';
    case 'battery': return 'PILE';
    case 'lightbulb': return 'AMP';
    case 'medication': return 'MED';
  }
}

export function buildBinPlaceholder(bin: Exclude<BinKind, 'hazardous'>, size: number, openness: number): Container {
  const c = new Container();
  const body = new Graphics();
  body.roundRect(0, size * 0.25, size, size * 0.7, size * 0.12).fill(BIN_COLORS[bin]);
  c.addChild(body);

  const lid = new Graphics();
  lid.roundRect(-size * 0.05, 0, size * 1.1, size * 0.18, size * 0.08).fill(0x000000, 0.85);
  lid.pivot.set(size * 0.5, size * 0.18);
  lid.x = size * 0.5;
  lid.y = size * 0.18;
  lid.rotation = -openness * Math.PI * 0.35;
  c.addChild(lid);
  return c;
}

export function generateTexture(renderer: Renderer, container: Container, w: number, h: number) {
  const tex = RenderTexture.create({ width: w, height: h, resolution: window.devicePixelRatio });
  renderer.render({ container, target: tex });
  return tex;
}
```

- [ ] **Step 3: Write `src/assets/PlaceholderAssetProvider.ts`**

```ts
import { Texture, type Renderer } from 'pixi.js';
import type { AssetProvider } from './AssetProvider';
import type { BinKind, WasteType } from '@/game/waste';
import { ALL_WASTE_TYPES } from '@/game/waste-data';
import { buildTilePlaceholder, buildBinPlaceholder, generateTexture } from './shapes';

const TILE_SIZE = 256;
const BIN_SIZE = 320;
const BIN_FRAME_COUNT = 8;

export class PlaceholderAssetProvider implements AssetProvider {
  private tiles = new Map<WasteType, Texture>();
  private binIdle = new Map<BinKind, Texture>();
  private binFrames = new Map<BinKind, Texture[]>();

  constructor(private readonly renderer: Renderer) {}

  async init(): Promise<void> {
    for (const t of ALL_WASTE_TYPES) {
      const c = buildTilePlaceholder(t, TILE_SIZE);
      this.tiles.set(t, generateTexture(this.renderer, c, TILE_SIZE, TILE_SIZE));
    }
    for (const bin of ['yellow', 'black', 'orange'] as const) {
      this.binIdle.set(bin, this.renderBinFrame(bin, 0));
      const frames: Texture[] = [];
      for (let i = 0; i < BIN_FRAME_COUNT; i++) {
        const open = i / (BIN_FRAME_COUNT - 1);
        frames.push(this.renderBinFrame(bin, open));
      }
      this.binFrames.set(bin, frames);
    }
  }

  private renderBinFrame(bin: Exclude<BinKind, 'hazardous'>, openness: number): Texture {
    const c = buildBinPlaceholder(bin, BIN_SIZE, openness);
    return generateTexture(this.renderer, c, BIN_SIZE, BIN_SIZE);
  }

  getTileTexture(type: WasteType): Texture {
    const t = this.tiles.get(type);
    if (!t) throw new Error(`No texture for waste type: ${type}`);
    return t;
  }

  getBinIdleTexture(bin: Exclude<BinKind, 'hazardous'>): Texture {
    const t = this.binIdle.get(bin);
    if (!t) throw new Error(`No idle for bin: ${bin}`);
    return t;
  }

  getBinOpenFrames(bin: Exclude<BinKind, 'hazardous'>): Texture[] {
    const f = this.binFrames.get(bin);
    if (!f) throw new Error(`No frames for bin: ${bin}`);
    return f;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/assets/
git commit -m "feat(assets): AssetProvider interface + placeholder Pixi-rendered tiles and bins"
```

---

# Phase D — Pixi rendering

## Task D1: PixiApp + layered hybrid bootstrap

**Files:**
- Create: `src/app/config.ts`
- Create: `src/app/animation-config.ts`
- Create: `src/render/PixiApp.ts`

- [ ] **Step 1: Write `src/app/config.ts`**

```ts
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;
export const MENU_WIDTH = 528;
export const PLAY_AREA_X = MENU_WIDTH;
export const PLAY_AREA_WIDTH = STAGE_WIDTH - MENU_WIDTH;
export const PLAY_AREA_HEIGHT = STAGE_HEIGHT;
export const GRID_PADDING = 80;
export const IDLE_MS = 60_000;
export const EDU_OVERLAY_MS = 4500;
```

- [ ] **Step 2: Write `src/app/animation-config.ts`**

```ts
export const ANIM = {
  swapValid: { duration: 0.15, ease: 'power2.out' },
  swapInvalid: { duration: 0.3, ease: 'power2.inOut' },
  flightToBin: { duration: 0.4, ease: 'power2.in' },
  binOpen: { duration: 0.5 },
  trapVortex: { duration: 0.5, ease: 'power2.in' },
  cascadeDropPerCell: 0.25,
  refill: { duration: 0.3, ease: 'power2.out' },
  scoreCountUp: { duration: 0.4, ease: 'power1.out' },
  overlayIn: { duration: 0.25, ease: 'power2.out' },
  overlayOut: { duration: 0.2, ease: 'power2.in' },
  screenCrossfade: { duration: 0.3, ease: 'power1.inOut' },
  screensaverFadeIn: { duration: 0.6, ease: 'power1.out' },
} as const;
```

- [ ] **Step 3: Write `src/render/PixiApp.ts`**

```ts
import { Application, Container } from 'pixi.js';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@/app/config';

export class PixiApp {
  readonly app: Application;
  readonly menuLayer: Container;
  readonly gridLayer: Container;
  readonly fxLayer: Container;
  readonly screensaverLayer: Container;

  private constructor(app: Application) {
    this.app = app;
    this.menuLayer = new Container();
    this.gridLayer = new Container();
    this.fxLayer = new Container();
    this.screensaverLayer = new Container();
    this.screensaverLayer.visible = false;
    app.stage.addChild(this.menuLayer, this.gridLayer, this.fxLayer, this.screensaverLayer);
  }

  static async create(): Promise<PixiApp> {
    const app = new Application();
    await app.init({
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    app.canvas.style.position = 'absolute';
    app.canvas.style.left = '0';
    app.canvas.style.top = '0';
    app.canvas.style.width = `${STAGE_WIDTH}px`;
    app.canvas.style.height = `${STAGE_HEIGHT}px`;
    app.canvas.style.zIndex = '1';
    app.canvas.style.pointerEvents = 'none';
    return new PixiApp(app);
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.app.canvas);
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/config.ts src/app/animation-config.ts src/render/PixiApp.ts
git commit -m "feat(render): PixiApp bootstrap with stacked layers (menu/grid/fx/screensaver)"
```

---

## Task D2: TileSprite + GridRenderer

**Files:**
- Create: `src/render/TileSprite.ts`
- Create: `src/render/GridRenderer.ts`

- [ ] **Step 1: Write `src/render/TileSprite.ts`**

```ts
import { Sprite, type Texture } from 'pixi.js';
import type { WasteType } from '@/game/waste';

export class TileSprite extends Sprite {
  type: WasteType;
  row: number;
  col: number;

  constructor(type: WasteType, texture: Texture, row: number, col: number, size: number) {
    super(texture);
    this.type = type;
    this.row = row;
    this.col = col;
    this.anchor.set(0.5);
    this.width = size;
    this.height = size;
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }
}
```

- [ ] **Step 2: Write `src/render/GridRenderer.ts`**

```ts
import { Container, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { TileSprite } from './TileSprite';
import type { AssetProvider } from '@/assets/AssetProvider';
import type { Grid, Pos } from '@/game/grid';
import type { LevelConfig } from '@/game/levels';
import { ANIM } from '@/app/animation-config';
import { GRID_PADDING, PLAY_AREA_HEIGHT, PLAY_AREA_WIDTH, PLAY_AREA_X } from '@/app/config';

export interface GridLayout {
  originX: number;
  originY: number;
  tileSize: number;
}

export class GridRenderer {
  readonly container: Container;
  readonly hitArea: Graphics;
  private tiles: (TileSprite | null)[][];
  layout: GridLayout;

  constructor(
    private readonly level: LevelConfig,
    private readonly assets: AssetProvider,
  ) {
    this.container = new Container();
    this.hitArea = new Graphics();
    this.container.addChild(this.hitArea);
    this.tiles = Array.from({ length: level.size }, () => Array.from({ length: level.size }, () => null));
    this.layout = this.computeLayout();
    this.drawHitArea();
  }

  private computeLayout(): GridLayout {
    const available = Math.min(PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT) - GRID_PADDING * 2;
    const tileSize = Math.floor(available / this.level.size);
    const total = tileSize * this.level.size;
    const originX = PLAY_AREA_X + (PLAY_AREA_WIDTH - total) / 2;
    const originY = (PLAY_AREA_HEIGHT - total) / 2;
    return { originX, originY, tileSize };
  }

  private drawHitArea(): void {
    const { originX, originY, tileSize } = this.layout;
    const total = tileSize * this.level.size;
    this.hitArea.clear();
    this.hitArea.rect(originX, originY, total, total).fill({ color: 0x000000, alpha: 0 });
    this.hitArea.eventMode = 'static';
  }

  cellToPixel(row: number, col: number): { x: number; y: number } {
    const { originX, originY, tileSize } = this.layout;
    return { x: originX + col * tileSize + tileSize / 2, y: originY + row * tileSize + tileSize / 2 };
  }

  pixelToCell(x: number, y: number): Pos | null {
    const { originX, originY, tileSize } = this.layout;
    const col = Math.floor((x - originX) / tileSize);
    const row = Math.floor((y - originY) / tileSize);
    if (row < 0 || col < 0 || row >= this.level.size || col >= this.level.size) return null;
    return { row, col };
  }

  populate(grid: Grid): void {
    for (let r = 0; r < this.level.size; r++) {
      for (let c = 0; c < this.level.size; c++) {
        const old = this.tiles[r]![c];
        if (old) old.destroy();
        const type = grid[r]![c]!;
        const sprite = new TileSprite(type, this.assets.getTileTexture(type), r, c, this.layout.tileSize);
        const { x, y } = this.cellToPixel(r, c);
        sprite.x = x;
        sprite.y = y;
        this.container.addChild(sprite);
        this.tiles[r]![c] = sprite;
      }
    }
  }

  getTile(row: number, col: number): TileSprite | null {
    return this.tiles[row]?.[col] ?? null;
  }

  setTile(row: number, col: number, tile: TileSprite | null): void {
    this.tiles[row]![col] = tile;
    if (tile) {
      tile.row = row;
      tile.col = col;
    }
  }

  swapVisual(a: Pos, b: Pos): gsap.core.Timeline {
    const ta = this.getTile(a.row, a.col)!;
    const tb = this.getTile(b.row, b.col)!;
    const pa = this.cellToPixel(a.row, a.col);
    const pb = this.cellToPixel(b.row, b.col);
    const tl = gsap.timeline();
    tl.to(ta, { x: pb.x, y: pb.y, ...ANIM.swapValid }, 0);
    tl.to(tb, { x: pa.x, y: pa.y, ...ANIM.swapValid }, 0);
    return tl;
  }

  swapAndUndo(a: Pos, b: Pos): gsap.core.Timeline {
    const ta = this.getTile(a.row, a.col)!;
    const tb = this.getTile(b.row, b.col)!;
    const pa = this.cellToPixel(a.row, a.col);
    const pb = this.cellToPixel(b.row, b.col);
    const tl = gsap.timeline();
    tl.to(ta, { x: pb.x, y: pb.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.out' }, 0);
    tl.to(tb, { x: pa.x, y: pa.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.out' }, 0);
    tl.to(ta, { x: pa.x, y: pa.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.in' });
    tl.to(tb, { x: pb.x, y: pb.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.in' }, '<');
    return tl;
  }

  applySwapInModel(a: Pos, b: Pos): void {
    const ta = this.getTile(a.row, a.col);
    const tb = this.getTile(b.row, b.col);
    this.setTile(a.row, a.col, tb);
    this.setTile(b.row, b.col, ta);
  }

  removeTilesAt(positions: Pos[]): TileSprite[] {
    const out: TileSprite[] = [];
    for (const p of positions) {
      const t = this.getTile(p.row, p.col);
      if (t) {
        out.push(t);
        this.setTile(p.row, p.col, null);
      }
    }
    return out;
  }

  applyDrops(drops: { from: Pos; to: Pos }[]): gsap.core.Timeline {
    const tl = gsap.timeline();
    const moved = new Map<TileSprite, Pos>();
    for (const d of drops) {
      const sprite = this.tiles[d.from.row]?.[d.from.col];
      if (!sprite) continue;
      this.tiles[d.from.row]![d.from.col] = null;
      moved.set(sprite, d.to);
    }
    for (const [sprite, to] of moved) {
      this.tiles[to.row]![to.col] = sprite;
      sprite.row = to.row;
      sprite.col = to.col;
      const { x, y } = this.cellToPixel(to.row, to.col);
      tl.to(sprite, { x, y, duration: ANIM.cascadeDropPerCell, ease: 'bounce.out' }, 0);
    }
    return tl;
  }

  applyRefill(additions: { to: Pos; type: import('@/game/waste').WasteType }[]): gsap.core.Timeline {
    const tl = gsap.timeline();
    const { tileSize, originY } = this.layout;
    for (const a of additions) {
      const tex = this.assets.getTileTexture(a.type);
      const sprite = new TileSprite(a.type, tex, a.to.row, a.to.col, tileSize);
      const target = this.cellToPixel(a.to.row, a.to.col);
      sprite.x = target.x;
      sprite.y = originY - tileSize;
      this.container.addChild(sprite);
      this.tiles[a.to.row]![a.to.col] = sprite;
      tl.to(sprite, { y: target.y, duration: ANIM.refill.duration, ease: 'power2.out' }, 0);
    }
    return tl;
  }
}
```

- [ ] **Step 2 (verify): typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/render/TileSprite.ts src/render/GridRenderer.ts
git commit -m "feat(render): TileSprite + GridRenderer (populate, swap visuals, drops, refill)"
```

---

## Task D3: BinRenderer

**Files:**
- Create: `src/render/BinRenderer.ts`

- [ ] **Step 1: Write `src/render/BinRenderer.ts`**

```ts
import { Container, Sprite } from 'pixi.js';
import { gsap } from 'gsap';
import type { AssetProvider } from '@/assets/AssetProvider';
import type { BinKind } from '@/game/waste';
import { ANIM } from '@/app/animation-config';

type RealBin = Exclude<BinKind, 'hazardous'>;

export class BinRenderer {
  readonly container: Container;
  private sprite: Sprite;
  private frames: import('pixi.js').Texture[];
  private idleTween: gsap.core.Tween | null = null;

  constructor(
    public readonly bin: RealBin,
    private readonly assets: AssetProvider,
    public readonly worldX: number,
    public readonly worldY: number,
    public readonly displayWidth: number,
  ) {
    this.container = new Container();
    this.frames = assets.getBinOpenFrames(bin);
    this.sprite = new Sprite(this.frames[0]);
    this.sprite.anchor.set(0.5);
    this.sprite.width = displayWidth;
    this.sprite.height = displayWidth;
    this.sprite.x = worldX;
    this.sprite.y = worldY;
    this.container.addChild(this.sprite);
    this.startIdle();
  }

  private startIdle(): void {
    this.idleTween = gsap.to(this.sprite, {
      y: this.worldY - 6,
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  worldPosition(): { x: number; y: number } {
    return { x: this.worldX, y: this.worldY };
  }

  playOpenClose(): gsap.core.Timeline {
    const tl = gsap.timeline();
    const half = ANIM.binOpen.duration / 2;
    const stepDuration = half / this.frames.length;
    this.frames.forEach((tex, i) => {
      tl.call(() => { this.sprite.texture = tex; }, [], i * stepDuration);
    });
    for (let i = this.frames.length - 1; i >= 0; i--) {
      tl.call(() => { this.sprite.texture = this.frames[i]!; }, [], half + (this.frames.length - 1 - i) * stepDuration);
    }
    return tl;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/BinRenderer.ts
git commit -m "feat(render): BinRenderer with idle bob and frame-by-frame open/close"
```

---

## Task D4: FlightAnimator + TrapEffect

**Files:**
- Create: `src/render/FlightAnimator.ts`
- Create: `src/render/TrapEffect.ts`

- [ ] **Step 1: Write `src/render/FlightAnimator.ts`**

```ts
import { gsap } from 'gsap';
import type { TileSprite } from './TileSprite';
import { ANIM } from '@/app/animation-config';

export interface FlightTarget { x: number; y: number; }

export function flyTileToBin(tile: TileSprite, target: FlightTarget): gsap.core.Timeline {
  const tl = gsap.timeline({
    onComplete: () => tile.destroy(),
  });
  const peakY = Math.min(tile.y, target.y) - 80;
  const midX = (tile.x + target.x) / 2;
  tl.to(tile, { x: midX, y: peakY, duration: ANIM.flightToBin.duration / 2, ease: 'power2.out' }, 0);
  tl.to(tile, { x: target.x, y: target.y, duration: ANIM.flightToBin.duration / 2, ease: 'power2.in' });
  tl.to(tile, { width: tile.width * 0.3, height: tile.height * 0.3, alpha: 0.6, duration: ANIM.flightToBin.duration, ease: 'power1.in' }, 0);
  return tl;
}
```

- [ ] **Step 2: Write `src/render/TrapEffect.ts`**

```ts
import { gsap } from 'gsap';
import type { TileSprite } from './TileSprite';
import { ANIM } from '@/app/animation-config';

export function trapVortex(tile: TileSprite): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: () => tile.destroy() });
  tl.to(tile, {
    rotation: Math.PI * 4,
    duration: ANIM.trapVortex.duration,
    ease: 'power2.in',
  }, 0);
  tl.to(tile, {
    width: 0,
    height: 0,
    alpha: 0,
    duration: ANIM.trapVortex.duration,
    ease: 'power2.in',
  }, 0);
  return tl;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/render/FlightAnimator.ts src/render/TrapEffect.ts
git commit -m "feat(render): tile→bin parabolic flight and trap vortex effect"
```

---

# Phase E — Input + DOM UI

## Task E1: Input router

**Files:**
- Create: `src/input/InputRouter.ts`
- Create: `src/input/IdleTracker.ts`

- [ ] **Step 1: Write `src/input/InputRouter.ts`**

```ts
import type { FederatedPointerEvent } from 'pixi.js';
import type { GridRenderer } from '@/render/GridRenderer';
import type { Pos } from '@/game/grid';

export interface SwapIntent { a: Pos; b: Pos; }

const DRAG_THRESHOLD_RATIO = 0.3;

export class InputRouter {
  private downCell: Pos | null = null;
  private downX = 0;
  private downY = 0;
  private selected: Pos | null = null;
  private listeners = new Set<(intent: SwapIntent) => void>();
  private enabled = true;

  constructor(private readonly grid: GridRenderer) {
    grid.hitArea.on('pointerdown', this.handlePointerDown);
    grid.hitArea.on('pointerup', this.handlePointerUp);
    grid.hitArea.on('pointerupoutside', this.handlePointerUp);
  }

  setEnabled(v: boolean): void { this.enabled = v; }

  onSwap(cb: (intent: SwapIntent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getSelected(): Pos | null { return this.selected; }

  setSelected(p: Pos | null): void { this.selected = p; }

  private emit(intent: SwapIntent): void {
    for (const cb of this.listeners) cb(intent);
  }

  private handlePointerDown = (e: FederatedPointerEvent): void => {
    if (!this.enabled) return;
    const cell = this.grid.pixelToCell(e.global.x, e.global.y);
    if (!cell) return;
    this.downCell = cell;
    this.downX = e.global.x;
    this.downY = e.global.y;
  };

  private handlePointerUp = (e: FederatedPointerEvent): void => {
    if (!this.enabled || !this.downCell) return;
    const dx = e.global.x - this.downX;
    const dy = e.global.y - this.downY;
    const tileSize = this.grid.layout.tileSize;
    const threshold = tileSize * DRAG_THRESHOLD_RATIO;
    const isDrag = Math.abs(dx) > threshold || Math.abs(dy) > threshold;

    if (isDrag) {
      const dir = Math.abs(dx) > Math.abs(dy)
        ? { row: 0, col: dx > 0 ? 1 : -1 }
        : { row: dy > 0 ? 1 : -1, col: 0 };
      const target = { row: this.downCell.row + dir.row, col: this.downCell.col + dir.col };
      this.selected = null;
      if (this.grid.pixelToCell(this.grid.cellToPixel(target.row, target.col).x, this.grid.cellToPixel(target.row, target.col).y)) {
        this.emit({ a: this.downCell, b: target });
      }
    } else {
      const cell = this.grid.pixelToCell(e.global.x, e.global.y);
      if (!cell) { this.downCell = null; return; }
      if (this.selected) {
        if (cell.row === this.selected.row && cell.col === this.selected.col) {
          this.selected = null;
        } else if (Math.abs(cell.row - this.selected.row) + Math.abs(cell.col - this.selected.col) === 1) {
          const a = this.selected;
          this.selected = null;
          this.emit({ a, b: cell });
        } else {
          this.selected = cell;
        }
      } else {
        this.selected = cell;
      }
    }
    this.downCell = null;
  };
}
```

- [ ] **Step 2: Write `src/input/IdleTracker.ts`**

```ts
export class IdleTracker {
  private timerId: number | null = null;
  private callbacks = new Set<() => void>();
  private pointerHandler = (): void => this.reset();

  constructor(private readonly delayMs: number) {}

  start(): void {
    window.addEventListener('pointerdown', this.pointerHandler, { capture: true });
    this.reset();
  }

  stop(): void {
    window.removeEventListener('pointerdown', this.pointerHandler, { capture: true });
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  reset(): void {
    if (this.timerId !== null) window.clearTimeout(this.timerId);
    this.timerId = window.setTimeout(() => {
      this.timerId = null;
      for (const cb of this.callbacks) cb();
    }, this.delayMs);
  }

  onIdle(cb: () => void): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/input/
git commit -m "feat(input): unified InputRouter (drag + tap-tap) and IdleTracker"
```

---

## Task E2: HUD + overlays (DOM)

**Files:**
- Create: `src/ui/HUD.ts`
- Create: `src/ui/overlays/EduOverlay.ts`
- Create: `src/ui/overlays/EndOverlay.ts`
- Create: `src/styles/menu.css`
- Create: `src/styles/overlays.css`

- [ ] **Step 1: Write `src/styles/menu.css`**

```css
.menu {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--menu-w);
  height: var(--stage-h);
  background: linear-gradient(180deg, var(--color-menu-from), var(--color-menu-to));
  color: var(--color-menu-text);
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: 48px 40px;
  gap: 24px;
}
.menu__infos { display: flex; flex-direction: column; gap: 4px; }
.menu__score { font-size: 48px; font-weight: 700; line-height: 1; }
.menu__score-label { font-size: 18px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.08em; }
.menu__level { font-size: 64px; font-weight: 900; line-height: 1; margin-top: 8px; }
.menu__bins { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; flex: 1; }
.menu__bin-label {
  font-size: 20px;
  font-weight: 500;
  padding: 8px 12px;
  background: rgba(255,255,255,0.12);
  border-radius: var(--radius-sm);
  align-self: flex-end;
}
.menu__footer { display: flex; gap: 16px; margin-top: auto; }
.menu__btn {
  flex: 1;
  padding: 16px;
  font-size: 18px;
  font-weight: 600;
  background: rgba(255,255,255,0.16);
  color: var(--color-menu-text);
  border-radius: var(--radius-md);
  transition: background 0.2s;
}
.menu__btn:hover, .menu__btn:active { background: rgba(255,255,255,0.28); }
```

- [ ] **Step 2: Write `src/styles/overlays.css`**

```css
.overlay {
  position: absolute;
  z-index: 3;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  padding: 32px 40px;
  pointer-events: auto;
  opacity: 0;
}
.overlay--end {
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.92);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  min-width: 600px;
}
.overlay--end h2 { font-size: 36px; font-weight: 700; }
.overlay--end .score { font-size: 64px; font-weight: 800; color: var(--color-menu-from); }
.overlay--end button {
  padding: 16px 40px;
  font-size: 24px;
  font-weight: 600;
  background: var(--color-menu-from);
  color: white;
  border-radius: var(--radius-md);
}

.overlay--edu {
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(40,40,40,0.92);
  color: white;
  text-align: center;
  font-size: 32px;
  line-height: 1.4;
  max-width: 1100px;
  border-left: 8px solid var(--color-warning);
}
```

- [ ] **Step 3: Write `src/ui/HUD.ts`**

```ts
import { gsap } from 'gsap';
import { MENU_WIDTH } from '@/app/config';
import { ANIM } from '@/app/animation-config';
import type { BinKind } from '@/game/waste';

const BIN_LABELS: Record<Exclude<BinKind, 'hazardous'>, string> = {
  yellow: 'Bac jaune — Recyclables',
  black: 'Sac noir — Résiduels',
  orange: 'Sac orange — Biodéchets',
};

export interface HUDCallbacks {
  onHome: () => void;
  onQuit: () => void;
}

export class HUD {
  readonly root: HTMLElement;
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private displayedScore = 0;

  constructor(level: 1 | 2 | 3, callbacks: HUDCallbacks) {
    const m = document.createElement('aside');
    m.className = 'menu';
    m.style.width = `${MENU_WIDTH}px`;

    m.innerHTML = `
      <div class="menu__infos">
        <span class="menu__score-label">Score</span>
        <span class="menu__score" data-score>0</span>
      </div>
      <div class="menu__level" data-level>Niveau ${String(level).padStart(2, '0')}</div>
      <div class="menu__bins">
        <div class="menu__bin-label">${BIN_LABELS.yellow}</div>
        <div class="menu__bin-label">${BIN_LABELS.black}</div>
        <div class="menu__bin-label">${BIN_LABELS.orange}</div>
      </div>
      <div class="menu__footer">
        <button class="menu__btn" data-home>Accueil</button>
        <button class="menu__btn" data-quit>Quitter le jeu</button>
      </div>
    `;
    this.root = m;
    this.scoreEl = m.querySelector('[data-score]') as HTMLElement;
    this.levelEl = m.querySelector('[data-level]') as HTMLElement;

    (m.querySelector('[data-home]') as HTMLButtonElement).onclick = callbacks.onHome;
    (m.querySelector('[data-quit]') as HTMLButtonElement).onclick = callbacks.onQuit;
  }

  setScore(value: number): void {
    const obj = { v: this.displayedScore };
    gsap.to(obj, {
      v: value,
      duration: ANIM.scoreCountUp.duration,
      ease: ANIM.scoreCountUp.ease,
      onUpdate: () => { this.scoreEl.textContent = String(Math.round(obj.v)); },
      onComplete: () => { this.displayedScore = value; this.scoreEl.textContent = String(value); },
    });
  }

  destroy(): void {
    this.root.remove();
  }
}
```

- [ ] **Step 4: Write `src/ui/overlays/EduOverlay.ts`**

```ts
import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';
import { EDU_OVERLAY_MS } from '@/app/config';

export class EduOverlay {
  readonly root: HTMLElement;
  private timeoutId: number | null = null;

  constructor() {
    const el = document.createElement('div');
    el.className = 'overlay overlay--edu';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    this.root = el;
  }

  show(text: string): void {
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.root.textContent = text;
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
    this.timeoutId = window.setTimeout(() => this.hide(), EDU_OVERLAY_MS);
  }

  hide(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
```

- [ ] **Step 5: Write `src/ui/overlays/EndOverlay.ts`**

```ts
import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';

export class EndOverlay {
  readonly root: HTMLElement;
  private scoreEl: HTMLElement;
  private btn: HTMLButtonElement;

  constructor(onSeeResult: () => void) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--end';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <h2>Plus de combinaisons possibles</h2>
      <span class="score" data-score>0</span>
      <button data-see>Voir le résultat</button>
    `;
    this.root = el;
    this.scoreEl = el.querySelector('[data-score]') as HTMLElement;
    this.btn = el.querySelector('[data-see]') as HTMLButtonElement;
    this.btn.onclick = onSeeResult;
  }

  show(score: number): void {
    this.scoreEl.textContent = String(score);
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
  }

  hide(): void {
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
```

- [ ] **Step 6: Import styles + commit**

Edit `src/main.ts` — append imports:

```ts
import './styles/menu.css';
import './styles/overlays.css';
```

```bash
git add src/ui/ src/styles/menu.css src/styles/overlays.css src/main.ts
git commit -m "feat(ui): HUD with animated score, EduOverlay, EndOverlay"
```

---

## Task E3: Welcome / EndMedia / Screensaver screens (DOM shells)

**Files:**
- Create: `src/styles/screens.css`
- Create: `src/ui/screens/WelcomeScreen.ts`
- Create: `src/ui/screens/EndMediaScreen.ts`
- Create: `src/ui/screens/ScreensaverScreen.ts`

- [ ] **Step 1: Write `src/styles/screens.css`**

```css
.screen {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  opacity: 0;
  pointer-events: none;
}
.screen--active { opacity: 1; pointer-events: auto; }

.welcome {
  align-items: center;
  justify-content: center;
  gap: 64px;
  background: linear-gradient(135deg, #F0FAF0 0%, #E0F5E8 100%);
}
.welcome__title {
  font-size: 96px;
  font-weight: 800;
  color: var(--color-menu-to);
  text-align: center;
}
.welcome__levels {
  display: flex;
  gap: 32px;
}
.welcome__btn {
  width: 380px;
  height: 220px;
  border-radius: var(--radius-lg);
  font-size: 36px;
  font-weight: 700;
  color: white;
  background: var(--color-menu-from);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s;
}
.welcome__btn:hover { transform: translateY(-4px); }
.welcome__btn--2 { background: var(--color-accent); }
.welcome__btn--3 { background: var(--color-warning); }
.welcome__btn small { font-size: 22px; opacity: 0.9; font-weight: 500; }

.endmedia {
  background: black;
  align-items: stretch;
  justify-content: stretch;
}
.endmedia__media {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
  background: radial-gradient(circle, #1a3a2a 0%, #000 100%);
}
.endmedia__buttons {
  position: absolute;
  bottom: 64px;
  right: 64px;
  display: flex;
  gap: 24px;
}
.endmedia__btn {
  padding: 24px 48px;
  font-size: 28px;
  font-weight: 700;
  border-radius: var(--radius-md);
  background: var(--color-menu-from);
  color: white;
}
.endmedia__btn--home { background: rgba(255,255,255,0.2); }

.screensaver {
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 50%, #1A8F4F 0%, #0a3a20 100%);
}
.screensaver__hint {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 28px;
  opacity: 0.7;
}
```

- [ ] **Step 2: Write `src/ui/screens/WelcomeScreen.ts`**

```ts
export interface WelcomeCallbacks {
  onSelectLevel: (level: 1 | 2 | 3) => void;
}

export class WelcomeScreen {
  readonly root: HTMLElement;

  constructor(callbacks: WelcomeCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen welcome';
    el.innerHTML = `
      <h1 class="welcome__title">Es-tu un serial trieur ?</h1>
      <div class="welcome__levels">
        <button class="welcome__btn welcome__btn--1" data-level="1">Niveau 1<small>Facile</small></button>
        <button class="welcome__btn welcome__btn--2" data-level="2">Niveau 2<small>Intermédiaire</small></button>
        <button class="welcome__btn welcome__btn--3" data-level="3">Niveau 3<small>Expert</small></button>
      </div>
    `;
    el.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((b) => {
      b.onclick = () => callbacks.onSelectLevel(Number(b.dataset.level) as 1 | 2 | 3);
    });
    this.root = el;
  }
}
```

- [ ] **Step 3: Write `src/ui/screens/EndMediaScreen.ts`**

```ts
export interface EndMediaCallbacks {
  onReplay: () => void;
  onHome: () => void;
}

export class EndMediaScreen {
  readonly root: HTMLElement;

  constructor(callbacks: EndMediaCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen endmedia';
    el.innerHTML = `
      <div class="endmedia__media">Vidéo de sensibilisation</div>
      <div class="endmedia__buttons">
        <button class="endmedia__btn endmedia__btn--home" data-home>Home</button>
        <button class="endmedia__btn" data-replay>Rejouer</button>
      </div>
    `;
    (el.querySelector('[data-replay]') as HTMLButtonElement).onclick = callbacks.onReplay;
    (el.querySelector('[data-home]') as HTMLButtonElement).onclick = callbacks.onHome;
    this.root = el;
  }
}
```

- [ ] **Step 4: Write `src/ui/screens/ScreensaverScreen.ts`**

```ts
export interface ScreensaverCallbacks {
  onWake: () => void;
}

export class ScreensaverScreen {
  readonly root: HTMLElement;

  constructor(callbacks: ScreensaverCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen screensaver';
    el.innerHTML = `<div class="screensaver__hint">Touchez l'écran pour reprendre</div>`;
    el.addEventListener('pointerdown', () => callbacks.onWake());
    this.root = el;
  }
}
```

- [ ] **Step 5: Wire styles + commit**

Edit `src/main.ts` — append:
```ts
import './styles/screens.css';
```

```bash
git add src/ui/screens/ src/styles/screens.css src/main.ts
git commit -m "feat(ui): Welcome, EndMedia, Screensaver DOM screens"
```

---

## Task E4: Pixi screensaver scene

**Files:**
- Create: `src/render/ScreensaverScene.ts`

- [ ] **Step 1: Write `src/render/ScreensaverScene.ts`**

A simple Pixi-only scene: déchets qui tombent et glissent vers leurs bacs en boucle.

```ts
import { Container, Sprite, type Texture, type Ticker } from 'pixi.js';
import type { AssetProvider } from '@/assets/AssetProvider';
import { ALL_WASTE_TYPES, WASTE_META } from '@/game/waste-data';
import type { WasteType, BinKind } from '@/game/waste';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@/app/config';

interface FallingItem { sprite: Sprite; vx: number; vy: number; type: WasteType; }

const BIN_X: Record<Exclude<BinKind, 'hazardous'>, number> = {
  yellow: STAGE_WIDTH * 0.3,
  black: STAGE_WIDTH * 0.55,
  orange: STAGE_WIDTH * 0.8,
};

export class ScreensaverScene {
  readonly container: Container;
  private items: FallingItem[] = [];
  private spawnTimer = 0;

  constructor(private readonly assets: AssetProvider) {
    this.container = new Container();
  }

  update(ticker: Ticker): void {
    this.spawnTimer -= ticker.deltaMS;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = 600;
    }
    for (const item of this.items) {
      item.sprite.x += item.vx * ticker.deltaTime;
      item.sprite.y += item.vy * ticker.deltaTime;
      item.vy += 0.15 * ticker.deltaTime;
    }
    this.items = this.items.filter((it) => {
      if (it.sprite.y > STAGE_HEIGHT + 100) {
        it.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  private spawn(): void {
    const type = ALL_WASTE_TYPES[Math.floor(Math.random() * ALL_WASTE_TYPES.length)]!;
    const meta = WASTE_META[type];
    const tex: Texture = this.assets.getTileTexture(type);
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.width = 96;
    s.height = 96;
    s.x = 80 + Math.random() * (STAGE_WIDTH - 160);
    s.y = -100;
    let vx = (Math.random() - 0.5) * 1.5;
    if (meta.bin !== 'hazardous') {
      const targetX = BIN_X[meta.bin];
      vx = (targetX - s.x) / 200;
    }
    this.container.addChild(s);
    this.items.push({ sprite: s, vx, vy: 0.5, type });
  }

  start(): void { this.container.visible = true; }
  stop(): void {
    this.container.visible = false;
    for (const it of this.items) it.sprite.destroy();
    this.items = [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/ScreensaverScene.ts
git commit -m "feat(render): Pixi screensaver scene with falling waste sorted into bins"
```

---

# Phase F — Orchestration & integration

## Task F1: ScreenManager

**Files:**
- Create: `src/app/ScreenManager.ts`

- [ ] **Step 1: Write `src/app/ScreenManager.ts`**

```ts
import { gsap } from 'gsap';
import { ANIM } from './animation-config';

export type ScreenKey = 'welcome' | 'game' | 'screensaver' | 'endmedia';

interface ScreenEntry { key: ScreenKey; root: HTMLElement; }

export class ScreenManager {
  private current: ScreenEntry | null = null;
  private previousNonScreensaver: ScreenKey = 'welcome';
  private screens = new Map<ScreenKey, HTMLElement>();

  constructor(private readonly host: HTMLElement) {}

  register(key: ScreenKey, root: HTMLElement): void {
    this.screens.set(key, root);
    this.host.appendChild(root);
  }

  show(key: ScreenKey): void {
    const root = this.screens.get(key);
    if (!root) throw new Error(`screen not registered: ${key}`);
    if (this.current?.key === key) return;
    if (key !== 'screensaver' && this.current?.key !== 'screensaver') {
      this.previousNonScreensaver = this.current?.key ?? key;
    }
    if (this.current) {
      const prev = this.current;
      gsap.to(prev.root, {
        opacity: 0,
        duration: ANIM.screenCrossfade.duration,
        onComplete: () => { prev.root.classList.remove('screen--active'); },
      });
    }
    root.classList.add('screen--active');
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: ANIM.screenCrossfade.duration });
    this.current = { key, root };
  }

  showScreensaver(): void {
    if (this.current?.key !== 'screensaver') {
      this.previousNonScreensaver = this.current?.key ?? 'welcome';
    }
    this.show('screensaver');
  }

  exitScreensaver(): void {
    this.show(this.previousNonScreensaver);
  }

  currentKey(): ScreenKey | null { return this.current?.key ?? null; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/ScreenManager.ts
git commit -m "feat(app): ScreenManager with cross-fade transitions and screensaver state restore"
```

---

## Task F2: GameScreen — wire grid + bins + input + HUD

**Files:**
- Create: `src/ui/screens/GameScreen.ts`

This is the orchestrator for an active game session. It owns: GameState, GridRenderer, three BinRenderer, HUD, EduOverlay, EndOverlay, InputRouter. It listens to swap intents, calls `applySwap`, plays the resulting animation timeline, then updates the HUD and overlays.

- [ ] **Step 1: Write `src/ui/screens/GameScreen.ts`**

```ts
import { gsap } from 'gsap';
import { Container } from 'pixi.js';
import type { PixiApp } from '@/render/PixiApp';
import type { AssetProvider } from '@/assets/AssetProvider';
import { GridRenderer } from '@/render/GridRenderer';
import { BinRenderer } from '@/render/BinRenderer';
import { flyTileToBin } from '@/render/FlightAnimator';
import { trapVortex } from '@/render/TrapEffect';
import { HUD } from '@/ui/HUD';
import { EduOverlay } from '@/ui/overlays/EduOverlay';
import { EndOverlay } from '@/ui/overlays/EndOverlay';
import { InputRouter } from '@/input/InputRouter';
import { applySwap, createGameState, type GameState } from '@/game/GameState';
import { getLevelConfig } from '@/game/levels';
import { createPrng } from '@/game/prng';
import { findValidMoves } from '@/game/matching';
import { WASTE_META } from '@/game/waste-data';
import type { BinKind } from '@/game/waste';
import { ANIM } from '@/app/animation-config';
import { MENU_WIDTH, STAGE_HEIGHT } from '@/app/config';

export interface GameScreenCallbacks {
  onHome: () => void;
  onSeeResult: (finalScore: number) => void;
}

export class GameScreen {
  readonly root: HTMLElement;
  readonly pixiContainer: Container;
  private state: GameState;
  private grid: GridRenderer;
  private bins: Record<Exclude<BinKind, 'hazardous'>, BinRenderer>;
  private hud: HUD;
  private edu: EduOverlay;
  private end: EndOverlay;
  private input: InputRouter;
  private prng: ReturnType<typeof createPrng>;
  private animating = false;
  private gameOverShown = false;

  constructor(
    private readonly pixi: PixiApp,
    private readonly assets: AssetProvider,
    level: 1 | 2 | 3,
    private readonly callbacks: GameScreenCallbacks,
  ) {
    this.prng = createPrng(Date.now() & 0xffffffff);
    this.state = createGameState(getLevelConfig(level), this.prng);

    this.pixiContainer = new Container();

    this.grid = new GridRenderer(this.state.config, assets);
    this.grid.populate(this.state.grid);
    this.pixiContainer.addChild(this.grid.container);

    const binY = STAGE_HEIGHT * 0.5;
    const binSpacing = 220;
    const binX = MENU_WIDTH * 0.55;
    this.bins = {
      yellow: new BinRenderer('yellow', assets, binX, binY - binSpacing, 200),
      black: new BinRenderer('black', assets, binX, binY, 200),
      orange: new BinRenderer('orange', assets, binX, binY + binSpacing, 200),
    };
    for (const b of Object.values(this.bins)) this.pixiContainer.addChild(b.container);

    this.hud = new HUD(level, {
      onHome: () => callbacks.onHome(),
      onQuit: () => callbacks.onSeeResult(this.state.score),
    });
    this.edu = new EduOverlay();
    this.end = new EndOverlay(() => callbacks.onSeeResult(this.state.score));

    const el = document.createElement('section');
    el.className = 'screen';
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
    el.appendChild(this.hud.root);

    const playArea = document.createElement('div');
    playArea.style.position = 'absolute';
    playArea.style.left = `${MENU_WIDTH}px`;
    playArea.style.top = '0';
    playArea.style.width = `${1920 - MENU_WIDTH}px`;
    playArea.style.height = `${STAGE_HEIGHT}px`;
    playArea.style.pointerEvents = 'none';
    playArea.appendChild(this.edu.root);
    playArea.appendChild(this.end.root);
    el.appendChild(playArea);

    this.root = el;

    this.input = new InputRouter(this.grid);
    this.input.onSwap((intent) => this.handleSwap(intent.a, intent.b));

    this.pixi.gridLayer.addChild(this.pixiContainer);
    this.pixi.app.canvas.style.pointerEvents = 'auto';
  }

  private async handleSwap(a: import('@/game/grid').Pos, b: import('@/game/grid').Pos): Promise<void> {
    if (this.animating || this.state.isOver) return;
    if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) !== 1) return;

    this.animating = true;
    this.input.setEnabled(false);

    const result = applySwap(this.state, a, b, this.prng);

    if (result.kind === 'invalid') {
      await this.grid.swapAndUndo(a, b).then();
      this.animating = false;
      this.input.setEnabled(true);
      return;
    }

    await this.grid.swapVisual(a, b).then();
    this.grid.applySwapInModel(a, b);

    for (const event of result.events) {
      const tl = gsap.timeline();
      const trapTexts: string[] = [];
      for (const m of event.step.matches) {
        const meta = WASTE_META[m.type];
        const sprites = this.grid.removeTilesAt(m.cells);
        if (meta.bin === 'hazardous') {
          for (const s of sprites) tl.add(trapVortex(s), 0);
          if (meta.educationalText) trapTexts.push(meta.educationalText);
        } else {
          const bin = this.bins[meta.bin];
          const target = bin.worldPosition();
          for (const s of sprites) tl.add(flyTileToBin(s, target), 0);
          tl.add(bin.playOpenClose(), ANIM.flightToBin.duration * 0.7);
        }
      }
      await tl.then();
      await this.grid.applyDrops(event.step.drops).then();
      await this.grid.applyRefill(event.step.refill).then();

      this.hud.setScore(this.state.score + this.cumulativeDelta(result, event));
      if (trapTexts.length > 0) this.edu.show(trapTexts[0]!);
    }

    this.state = result.next;
    this.hud.setScore(this.state.score);
    this.animating = false;
    this.input.setEnabled(true);

    if (this.state.isOver && !this.gameOverShown) {
      this.gameOverShown = true;
      this.end.show(this.state.score);
    }
  }

  private cumulativeDelta(result: Extract<ReturnType<typeof applySwap>, { kind: 'resolved' }>, current: typeof result.events[number]): number {
    let sum = 0;
    for (const e of result.events) {
      sum += e.scoreForStep;
      if (e === current) break;
    }
    return sum;
  }

  destroy(): void {
    for (const b of Object.values(this.bins)) b.destroy();
    this.pixi.gridLayer.removeChild(this.pixiContainer);
    this.pixiContainer.destroy({ children: true });
    this.hud.destroy();
    this.root.remove();
    this.pixi.app.canvas.style.pointerEvents = 'none';
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/screens/GameScreen.ts
git commit -m "feat(app): GameScreen orchestrator (state + Pixi grid/bins + HUD + overlays + input)"
```

---

## Task F3: App.ts top-level wiring

**Files:**
- Create: `src/app/App.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write `src/app/App.ts`**

```ts
import { PixiApp } from '@/render/PixiApp';
import { PlaceholderAssetProvider } from '@/assets/PlaceholderAssetProvider';
import { ScreenManager } from './ScreenManager';
import { WelcomeScreen } from '@/ui/screens/WelcomeScreen';
import { EndMediaScreen } from '@/ui/screens/EndMediaScreen';
import { ScreensaverScreen } from '@/ui/screens/ScreensaverScreen';
import { GameScreen } from '@/ui/screens/GameScreen';
import { ScreensaverScene } from '@/render/ScreensaverScene';
import { IdleTracker } from '@/input/IdleTracker';
import { IDLE_MS } from './config';

export class App {
  private pixi!: PixiApp;
  private assets!: PlaceholderAssetProvider;
  private screens!: ScreenManager;
  private idle!: IdleTracker;
  private screensaverScene!: ScreensaverScene;
  private currentGame: GameScreen | null = null;
  private lastFinalScore = 0;

  constructor(private readonly host: HTMLElement) {}

  async start(): Promise<void> {
    this.host.style.position = 'relative';
    this.host.style.width = '1920px';
    this.host.style.height = '1080px';
    this.host.style.overflow = 'hidden';

    this.pixi = await PixiApp.create();
    this.pixi.mount(this.host);

    this.assets = new PlaceholderAssetProvider(this.pixi.app.renderer);
    await this.assets.init();

    this.screensaverScene = new ScreensaverScene(this.assets);
    this.pixi.screensaverLayer.addChild(this.screensaverScene.container);

    this.screens = new ScreenManager(this.host);

    const welcome = new WelcomeScreen({
      onSelectLevel: (lvl) => this.startGame(lvl),
    });
    const endmedia = new EndMediaScreen({
      onReplay: () => this.goHome(),
      onHome: () => this.goHome(),
    });
    const screensaver = new ScreensaverScreen({
      onWake: () => this.exitScreensaver(),
    });

    this.screens.register('welcome', welcome.root);
    this.screens.register('endmedia', endmedia.root);
    this.screens.register('screensaver', screensaver.root);

    this.screens.show('welcome');

    this.idle = new IdleTracker(IDLE_MS);
    this.idle.onIdle(() => this.enterScreensaver());
    this.idle.start();

    this.pixi.app.ticker.add(() => {
      if (this.pixi.screensaverLayer.visible) this.screensaverScene.update(this.pixi.app.ticker);
    });
  }

  private startGame(level: 1 | 2 | 3): void {
    this.disposeCurrentGame();
    const game = new GameScreen(this.pixi, this.assets, level, {
      onHome: () => this.goHome(),
      onSeeResult: (score) => {
        this.lastFinalScore = score;
        this.disposeCurrentGame();
        this.screens.show('endmedia');
      },
    });
    this.host.appendChild(game.root);
    this.screens.register('game', game.root);
    this.screens.show('game');
    this.currentGame = game;
  }

  private goHome(): void {
    this.disposeCurrentGame();
    this.screens.show('welcome');
  }

  private disposeCurrentGame(): void {
    if (this.currentGame) {
      this.currentGame.destroy();
      this.currentGame = null;
    }
  }

  private enterScreensaver(): void {
    if (this.screens.currentKey() === 'screensaver') return;
    this.screensaverScene.start();
    this.pixi.screensaverLayer.visible = true;
    this.screens.showScreensaver();
  }

  private exitScreensaver(): void {
    this.screensaverScene.stop();
    this.pixi.screensaverLayer.visible = false;
    this.screens.exitScreensaver();
    this.idle.reset();
  }
}
```

- [ ] **Step 2: Rewrite `src/main.ts`**

```ts
import './styles/reset.css';
import './styles/theme.css';
import './styles/menu.css';
import './styles/overlays.css';
import './styles/screens.css';

import { App } from './app/App';

const root = document.getElementById('app');
if (!root) throw new Error('#app element not found');

const app = new App(root);
app.start().catch((err) => {
  console.error('Trifyl failed to start', err);
  root.textContent = 'Erreur de démarrage. Voir la console.';
});
```

- [ ] **Step 3: Verify build + typecheck**

Run: `npm run build`
Expected: `dist/` produced, no errors.

- [ ] **Step 4: Verify dev**

Run: `npm run dev`
Open `http://localhost:5173/` in a browser. Expected:
- Welcome screen with title and 3 level buttons.
- Click Niveau 1 → 5×5 grid appears, 3 bins visible on the left, score = 0.
- Drag a tile to a neighbor that creates a 3-match → tiles fly to bin, score increases.
- Drag to a non-matching neighbor → swap+undo animation.
- Wait 60s without input → screensaver appears with falling waste.
- Tap → returns to previous screen.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.ts src/main.ts
git commit -m "feat(app): top-level App wires Pixi + screens + idle tracker; full flow runnable"
```

---

# Phase G — Polish & docs

## Task G1: README + manual test checklist

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Trifyl

Jeu Match-3 éducatif sur le tri des déchets, conçu pour borne tactile fixe 1920×1080.

## Stack

TypeScript strict + PixiJS v8 + GSAP + Vite + Vitest.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (logique pure)
npm run build    # bundle de production dans dist/
```

## Documentation de conception

Voir [`docs/superpowers/specs/2026-04-26-trifyl-game-design.md`](docs/superpowers/specs/2026-04-26-trifyl-game-design.md) pour la spec complète et [`docs/superpowers/plans/2026-04-28-trifyl-implementation.md`](docs/superpowers/plans/2026-04-28-trifyl-implementation.md) pour le plan d'implémentation.

## Architecture

- `src/game/` — logique pure (testée), 0 dépendance Pixi/DOM
- `src/render/` — Pixi (grille, bacs, animations)
- `src/ui/` — DOM (HUD, overlays, écrans)
- `src/input/` — drag + tap + idle
- `src/app/` — orchestration top-level
- `src/assets/` — interface AssetProvider + placeholders

## Test manuel (checklist v1)

- [ ] Welcome → Niveau 1 → grille 5×5 visible.
- [ ] Drag valide ⇒ vol vers bac + score.
- [ ] Drag invalide ⇒ swap + undo.
- [ ] Tap-tap deux cases adjacentes ⇒ swap.
- [ ] Cascade ⇒ multiplicateur appliqué (visible dans le compteur).
- [ ] Match piège (pile en niveau 1) ⇒ tourbillon + overlay éducatif 4-5s.
- [ ] Plus de combinaisons ⇒ overlay "Plus de combinaisons possibles" + bouton Voir le résultat.
- [ ] Bouton "Quitter le jeu" ⇒ écran média de fin.
- [ ] Bouton "Accueil" ⇒ retour direct au welcome.
- [ ] 60s d'inactivité ⇒ screensaver, retour à l'écran d'origine au tap.
- [ ] Niveaux 2 (10×10) et 3 (15×15) bootent correctement.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with stack, scripts, architecture, manual test checklist"
```

---

## Task G2: Verification + sanity polish

- [ ] **Step 1: Run all checks**

```bash
npm test
npx tsc -b --noEmit
npm run build
```

All three must succeed cleanly.

- [ ] **Step 2: Manual run**

```bash
npm run dev
```

Walk through the manual test checklist in README.md. Note any issues; fix them as small focused commits.

- [ ] **Step 3: Final commit (only if any fixes)**

```bash
git commit -am "fix: address manual-test findings"
```

---

# Self-review

**Spec coverage check:**
- §2 stack — A1 ✓
- §3 1920×1080 fixed — D1 (PixiApp), F3 (host sizing) ✓
- §4 layered hybrid (DOM/Pixi/Background) — D1, F3 ✓
- §5 types & level configs — B2, B3 ✓
- §6 game loop, swap, cascade, refill, end detection — B5, B6, B7, B9 ✓
- §6 isAnimating + input pause — F2 (`this.animating` flag + `input.setEnabled`) ✓
- §7 score (3/4/5/6+, trap, cascade ×N capped 5) — B8 ✓
- §8.1 welcome — E3 ✓
- §8.2 game screen layout — E2, F2 ✓
- §8.3 screensaver (60s, state preserved) — E3, E4, F1, F3 ✓
- §8.4 endmedia + Rejouer/Home — E3, F3 ✓
- §9 animations — D2/D3/D4 + animation-config in D1 ✓
- §10 Playful Flat palette — A2 ✓
- §11 AssetProvider abstraction — C1 ✓
- §12 Vitest + tests on critical pure functions — B1–B9 ✓
- §13 file structure — matches plan file map ✓
- §14 hors scope — none of those features are added ✓

**Placeholder scan:** none. Every step has runnable code or commands.

**Type consistency:**
- `Pos`, `Grid`, `Cell`, `MatchGroup`, `DropMove`, `RefillAddition`, `CascadeStep`, `CascadeResult`, `SwapResult`, `ResolvedEvent` defined and consistently re-imported.
- `BinKind` and `Exclude<BinKind, 'hazardous'>` used consistently for "real bin" parameters.
- `WasteType` table is single source of truth.

Plan ready.
