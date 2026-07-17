# Effet « Bravo » + paillettes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher un bandeau « Bravo » et une animation de paillettes (confettis image) à la fin de chaque niveau, en transcrivant en TypeScript pur le code confetti de vaujany-app.

**Architecture:** Un module `Confetti` autonome (canvas plein écran + `tsparticles-confetti`) exposant `celebrate()`, piloté par une logique de paramètres pure et testable (`confetti-config.ts`). `LevelCompleteOverlay` est refondu pour afficher les assets `bravo/` et déclenche les paillettes à l'ouverture. `App` instancie le canvas, pré-charge les paillettes, et affiche l'overlay à chaque fin de niveau (bouton « Continuer » masqué au niveau 3).

**Tech Stack:** TypeScript, Vite (`import.meta.glob`), PixiJS (existant), GSAP (existant), `tsparticles-confetti` (nouveau), Vitest.

## Global Constraints

- Plain TypeScript uniquement — aucun React, aucun contexte React.
- Assets résolus via `import.meta.glob('./files/**/*.png', { query: '?url' })` ; jamais de chemin `public/` en dur.
- Scène fixée à 1920×1080 ; conserver le facteur d'échelle `window.innerWidth / 1920` de la source.
- Paramètres de tir identiques à la source : 2 salves, origines `x∈{0.1, 0.9}` / `y:0.2`, `particleCount:30`, paillettes `32×32`, `shapes:["image"]`.
- Kiosque tactile BrightSign : le canvas de paillettes est décoratif → `pointer-events:none`, ne doit bloquer aucun clic.
- Tests : le repo n'a pas d'environnement DOM (jsdom absent). Tester uniquement la logique pure ; vérifier le DOM/canvas par typecheck + build + exécution.
- `ConfettiUtils.js` de la source n'est PAS transcrit (coquille vide, YAGNI).

---

### Task 1: Assets paillettes + dépendance

**Files:**
- Create: `src/assets/files/paillettes/PAILLETTES_1.png` … `PAILLETTES_20.png` (copie)
- Modify: `package.json` (ajout dépendance)

**Interfaces:**
- Consumes: rien.
- Produces: 20 fichiers `src/assets/files/paillettes/PAILLETTES_*.png` captés par le glob existant ; le paquet `tsparticles-confetti` importable.

- [ ] **Step 1: Copier les 20 paillettes**

```bash
mkdir -p "src/assets/files/paillettes"
cp "/Users/pauldoazan/Projets/Perso/Bixie/vaujany-app/public/images/paillettes/"PAILLETTES_*.png "src/assets/files/paillettes/"
```

- [ ] **Step 2: Vérifier la copie (20 fichiers)**

Run: `ls src/assets/files/paillettes | wc -l`
Expected: `20`

- [ ] **Step 3: Ajouter la dépendance**

Run: `npm install tsparticles-confetti@^2.12.0`
Expected: `package.json` liste `tsparticles-confetti` dans `dependencies`, install OK.

- [ ] **Step 4: Vérifier l'import et le build**

Run: `npm run build`
Expected: build OK (aucune erreur). Le glob existant capte déjà les nouvelles paillettes.

- [ ] **Step 5: Commit**

```bash
git add src/assets/files/paillettes package.json package-lock.json
git commit -m "feat(assets): ajoute paillettes + dépendance tsparticles-confetti"
```

---

### Task 2: AssetProvider — URLs paillettes & bravo

**Files:**
- Modify: `src/assets/AssetProvider.ts:9-18` (interface)
- Modify: `src/assets/FileAssetProvider.ts` (glob paillettes + méthodes)

**Interfaces:**
- Consumes: `import.meta.glob` (Task 1 a fourni les fichiers).
- Produces:
  - `AssetProvider.getPaillettesUrls(): string[]`
  - `AssetProvider.getBravoUrl(): string`
  - `AssetProvider.getBravoButtonUrl(kind: 'continuer' | 'quitter'): string`

- [ ] **Step 1: Étendre l'interface `AssetProvider`**

Dans `src/assets/AssetProvider.ts`, ajouter les 3 méthodes à l'interface (après `getBinPleineUrl`) :

```ts
export interface AssetProvider {
  init(): Promise<void>;
  getTileTexture(type: WasteType): Texture;
  getGridTexture(level: 1 | 2 | 3): Texture;
  getScreenImageUrl(key: ScreenImageKey): string;
  getButtonUrl(key: ButtonKey): string;
  getPopupUrl(key: PopupKey): string;
  getBinVideUrl(level: 1 | 2 | 3, bin: BinCategory): string;
  getBinPleineUrl(bin: BinCategory): string;
  getPaillettesUrls(): string[];
  getBravoUrl(): string;
  getBravoButtonUrl(kind: 'continuer' | 'quitter'): string;
}
```

- [ ] **Step 2: Ajouter le glob paillettes dans `FileAssetProvider.ts`**

Juste après la ligne `const FILES = import.meta.glob(...)` (ligne 36), ajouter :

```ts
const PAILLETTES = import.meta.glob('./files/paillettes/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
```

- [ ] **Step 3: Implémenter les 3 méthodes**

Dans la classe `FileAssetProvider`, après `getBinPleineUrl` (ligne 79), ajouter :

```ts
  getPaillettesUrls(): string[] {
    return Object.values(PAILLETTES);
  }
  getBravoUrl(): string { return url('bravo/bravo'); }
  getBravoButtonUrl(kind: 'continuer' | 'quitter'): string {
    return url(kind === 'continuer' ? 'bravo/bouton-continuer' : 'bravo/bouton-quitter-partie');
  }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found` (l'interface et l'implémentation concordent).

- [ ] **Step 5: Commit**

```bash
git add src/assets/AssetProvider.ts src/assets/FileAssetProvider.ts
git commit -m "feat(assets): expose URLs paillettes et bravo"
```

---

### Task 3: Logique pure des confettis (`confetti-config.ts`) — TDD

**Files:**
- Create: `src/ui/overlays/confetti-config.ts`
- Test: `src/ui/overlays/confetti-config.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `interface ImageShapeOption { src: string; width: number; height: number }`
  - `interface ShapeOptions { image: ImageShapeOption[] }`
  - `interface BurstParams { origin: { x: number; y: number }; spread: number; ticks: number; gravity: number; decay: number; startVelocity: number; particleCount: number; scalar: number; shapes: string[]; shapeOptions: ShapeOptions }`
  - `buildShapeOptions(urls: string[]): ShapeOptions`
  - `buildBurstParams(innerWidth: number, originX: number, shapeOptions: ShapeOptions): BurstParams`

- [ ] **Step 1: Écrire les tests (qui échouent)**

Créer `src/ui/overlays/confetti-config.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { buildShapeOptions, buildBurstParams } from './confetti-config';

describe('buildShapeOptions', () => {
  it('mappe les URLs en options image 32×32 sous la clé "image"', () => {
    expect(buildShapeOptions(['a.png', 'b.png'])).toEqual({
      image: [
        { src: 'a.png', width: 32, height: 32 },
        { src: 'b.png', width: 32, height: 32 },
      ],
    });
  });
});

describe('buildBurstParams', () => {
  it('à 1920px reprend les valeurs de base de la source', () => {
    const so = { image: [] };
    const p = buildBurstParams(1920, 0.1, so);
    expect(p.origin).toEqual({ x: 0.1, y: 0.2 });
    expect(p.spread).toBe(270);
    expect(p.ticks).toBe(200);
    expect(p.gravity).toBe(1);
    expect(p.decay).toBeCloseTo(0.94);
    expect(p.startVelocity).toBe(20);
    expect(p.particleCount).toBe(30);
    expect(p.scalar).toBe(4);
    expect(p.shapes).toEqual(['image']);
    expect(p.shapeOptions).toBe(so);
  });

  it('met à l’échelle par innerWidth/1920', () => {
    const p = buildBurstParams(960, 0.9, { image: [] });
    expect(p.origin.x).toBe(0.9);
    expect(p.spread).toBe(135);
    expect(p.scalar).toBe(2);
    expect(p.gravity).toBe(0.5);
    expect(p.startVelocity).toBe(10);
    expect(p.decay).toBeCloseTo(0.935);
  });
});
```

- [ ] **Step 2: Lancer les tests → ils échouent**

Run: `npx vitest run src/ui/overlays/confetti-config.test.ts`
Expected: FAIL (`Cannot find module './confetti-config'`).

- [ ] **Step 3: Implémenter `confetti-config.ts`**

Créer `src/ui/overlays/confetti-config.ts` :

```ts
export interface ImageShapeOption {
  src: string;
  width: number;
  height: number;
}

export interface ShapeOptions {
  image: ImageShapeOption[];
}

export interface BurstParams {
  origin: { x: number; y: number };
  spread: number;
  ticks: number;
  gravity: number;
  decay: number;
  startVelocity: number;
  particleCount: number;
  scalar: number;
  shapes: string[];
  shapeOptions: ShapeOptions;
}

const PAILLETTE_SIZE = 32;
const PARTICLE_COUNT = 30;

/** Construit les options d'images (paillettes) pour tsparticles-confetti. */
export function buildShapeOptions(urls: string[]): ShapeOptions {
  return {
    image: urls.map((src) => ({ src, width: PAILLETTE_SIZE, height: PAILLETTE_SIZE })),
  };
}

/** Paramètres d'une salve, mis à l'échelle comme la source (innerWidth/1920). */
export function buildBurstParams(
  innerWidth: number,
  originX: number,
  shapeOptions: ShapeOptions,
): BurstParams {
  const k = innerWidth / 1920;
  return {
    origin: { x: originX, y: 0.2 },
    spread: 270 * k,
    ticks: 200,
    gravity: 1 * k,
    decay: 0.93 + 0.01 * k,
    startVelocity: 20 * k,
    particleCount: PARTICLE_COUNT,
    scalar: 4 * k,
    shapes: ['image'],
    shapeOptions,
  };
}
```

- [ ] **Step 4: Lancer les tests → ils passent**

Run: `npx vitest run src/ui/overlays/confetti-config.test.ts`
Expected: PASS (3 tests verts).

- [ ] **Step 5: Commit**

```bash
git add src/ui/overlays/confetti-config.ts src/ui/overlays/confetti-config.test.ts
git commit -m "feat(confetti): logique pure des paramètres de salve"
```

---

### Task 4: Module `Confetti` (canvas + tsparticles)

**Files:**
- Create: `src/ui/overlays/Confetti.ts`
- Create (si nécessaire, voir Step 4): `src/types/tsparticles-confetti.d.ts`

**Interfaces:**
- Consumes: `AssetProvider.getPaillettesUrls()` (Task 2) ; `buildShapeOptions`, `buildBurstParams`, `ShapeOptions` (Task 3) ; `confetti` de `tsparticles-confetti` (Task 1).
- Produces: `class Confetti` avec `readonly canvas: HTMLCanvasElement`, `init(): Promise<void>`, `celebrate(): void`.

- [ ] **Step 1: Créer `Confetti.ts`**

```ts
import { confetti } from 'tsparticles-confetti';
import type { AssetProvider } from '@/assets/AssetProvider';
import { buildShapeOptions, buildBurstParams, type ShapeOptions } from './confetti-config';

type FireFn = (options: ReturnType<typeof buildBurstParams>) => Promise<unknown>;

/**
 * Canvas plein écran de paillettes (transcription plain TS de Confettis.jsx).
 * Monté une fois dans App, réutilisé à chaque fin de niveau.
 */
export class Confetti {
  readonly canvas: HTMLCanvasElement;
  private fire: FireFn | null = null;
  private readonly urls: string[];
  private readonly shapeOptions: ShapeOptions;

  constructor(assets: AssetProvider) {
    this.urls = assets.getPaillettesUrls();
    this.shapeOptions = buildShapeOptions(this.urls);
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;';
    this.canvas = canvas;
  }

  /** Crée l'instance tsparticles et pré-charge les paillettes. */
  async init(): Promise<void> {
    this.fire = (await confetti.create(this.canvas, { resize: true })) as unknown as FireFn;
    this.preload();
  }

  /** Pré-charge les 20 paillettes pour éviter tout délai à la 1re salve. */
  private preload(): void {
    for (const src of this.urls) {
      const img = new Image();
      img.src = src;
    }
  }

  /** 2 salves (gauche puis droite), identiques à la source. */
  celebrate(): void {
    const fire = this.fire;
    if (!fire) return;
    for (let i = 0; i < 2; i++) {
      const originX = i % 2 === 0 ? 0.1 : 0.9;
      const params = buildBurstParams(window.innerWidth, originX, this.shapeOptions);
      window.setTimeout(() => { void fire(params); }, 300 * i);
    }
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: (Seulement si Step 2 échoue sur les types de `tsparticles-confetti`)**

Si `tsc` signale que le module n'a pas de types, créer `src/types/tsparticles-confetti.d.ts` :

```ts
declare module 'tsparticles-confetti' {
  export const confetti: {
    create(
      canvas: HTMLCanvasElement,
      options: { resize: boolean },
    ): Promise<(options: Record<string, unknown>) => Promise<unknown>>;
  };
}
```

Puis relancer `npx tsc --noEmit` → doit passer. (Si Step 2 est déjà vert, ignorer ce step.)

- [ ] **Step 5: Commit**

```bash
git add src/ui/overlays/Confetti.ts src/types/tsparticles-confetti.d.ts 2>/dev/null; git add src/ui/overlays/Confetti.ts
git commit -m "feat(confetti): module canvas Confetti (plain TS)"
```

---

### Task 5: Refonte `LevelCompleteOverlay` (assets bravo + paillettes)

**Files:**
- Modify: `src/ui/overlays/LevelCompleteOverlay.ts` (réécriture)
- Modify: `src/styles/overlays.css` (styles bravo)

**Interfaces:**
- Consumes: `AssetProvider.getBravoUrl()`, `getBravoButtonUrl()` (Task 2) ; `Confetti.celebrate()` (Task 4).
- Produces: `class LevelCompleteOverlay` avec `constructor(assets, confetti, callbacks)`, `show(options: { showContinue: boolean })`, `hide()`, `readonly root`.

- [ ] **Step 1: Réécrire `LevelCompleteOverlay.ts`**

```ts
import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';
import type { AssetProvider } from '@/assets/AssetProvider';
import type { Confetti } from './Confetti';

export interface LevelCompleteCallbacks {
  onContinue: () => void;
  onQuit: () => void;
}

export class LevelCompleteOverlay {
  readonly root: HTMLElement;
  private readonly continueBtn: HTMLButtonElement;

  constructor(
    assets: AssetProvider,
    private readonly confetti: Confetti,
    callbacks: LevelCompleteCallbacks,
  ) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--levelcomplete';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="levelcomplete__card">
        <div class="levelcomplete__bravo"></div>
        <div class="levelcomplete__buttons">
          <button data-continue class="levelcomplete__imgbtn levelcomplete__imgbtn--continue" aria-label="Continuer"></button>
          <button data-quit class="levelcomplete__imgbtn levelcomplete__imgbtn--quit" aria-label="Quitter la partie"></button>
        </div>
      </div>
    `;
    (el.querySelector('.levelcomplete__bravo') as HTMLElement).style.backgroundImage =
      `url("${assets.getBravoUrl()}")`;
    this.continueBtn = el.querySelector('[data-continue]') as HTMLButtonElement;
    const quitBtn = el.querySelector('[data-quit]') as HTMLButtonElement;
    this.continueBtn.style.backgroundImage = `url("${assets.getBravoButtonUrl('continuer')}")`;
    quitBtn.style.backgroundImage = `url("${assets.getBravoButtonUrl('quitter')}")`;
    this.continueBtn.onclick = callbacks.onContinue;
    quitBtn.onclick = callbacks.onQuit;
    this.root = el;
  }

  show(options: { showContinue: boolean }): void {
    this.continueBtn.style.display = options.showContinue ? '' : 'none';
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
    this.confetti.celebrate();
  }

  hide(): void {
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
```

- [ ] **Step 2: Adapter les styles dans `src/styles/overlays.css`**

Remplacer le bloc existant `.levelcomplete__card { ... }` et `.levelcomplete__buttons { ... }` (ainsi que les anciens `.levelcomplete__btn*` s'ils existent) par :

```css
.levelcomplete__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  background: none;
  padding: 0;
}
.levelcomplete__bravo {
  width: 870px;
  height: 246px;
  background: center / contain no-repeat;
}
.levelcomplete__buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.levelcomplete__imgbtn {
  background: center / contain no-repeat;
  cursor: pointer;
}
.levelcomplete__imgbtn--continue { width: 414px; height: 84px; }
.levelcomplete__imgbtn--quit { width: 413px; height: 84px; }
```

Note : `.overlay--levelcomplete` (fond semi-transparent + centrage) et `.reset.css` (bouton `background:none;border:0`) restent inchangés.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: OK (le constructeur a changé de signature ; App sera adapté en Task 6 — s'il y a une erreur ici, elle vient de `App.ts` non encore mis à jour ; c'est attendu, on la corrige en Task 6. Pour valider ce step isolément, vérifier au moins qu'il n'y a pas d'erreur DANS `LevelCompleteOverlay.ts` / `overlays.css`).

- [ ] **Step 4: Commit**

```bash
git add src/ui/overlays/LevelCompleteOverlay.ts src/styles/overlays.css
git commit -m "feat(overlay): bandeau bravo + boutons image, déclenche les paillettes"
```

---

### Task 6: Câblage `App` (instanciation, préchargement, déclenchement)

**Files:**
- Modify: `src/app/App.ts`

**Interfaces:**
- Consumes: `Confetti` (Task 4), `LevelCompleteOverlay(assets, confetti, callbacks)` + `show({ showContinue })` (Task 5).
- Produces: comportement final — overlay bravo à chaque fin de niveau ; « Continuer » masqué au niveau 3 ; paillettes pré-chargées.

- [ ] **Step 1: Importer `Confetti` et ajouter le champ**

Dans `src/app/App.ts`, ajouter l'import (près des autres imports d'overlays) :

```ts
import { Confetti } from '@/ui/overlays/Confetti';
```

Et déclarer le champ (près de `private levelComplete!: LevelCompleteOverlay;`) :

```ts
  private confetti!: Confetti;
```

- [ ] **Step 2: Instancier le canvas + préchargement dans `start()`**

Dans `start()`, juste après `await this.assets.init();` (ligne ~34), ajouter :

```ts
    this.confetti = new Confetti(this.assets);
    this.host.appendChild(this.confetti.canvas);
    await this.confetti.init();
```

- [ ] **Step 3: Adapter la construction de `LevelCompleteOverlay`**

Remplacer le bloc existant (lignes ~53-57) :

```ts
    this.levelComplete = new LevelCompleteOverlay({
      onContinue: () => this.continueNextLevel(),
      onQuit: () => this.goMedia(),
    });
    this.host.appendChild(this.levelComplete.root);
```

par :

```ts
    this.levelComplete = new LevelCompleteOverlay(this.assets, this.confetti, {
      onContinue: () => this.continueNextLevel(),
      onQuit: () => this.goMedia(),
    });
    this.host.appendChild(this.levelComplete.root);
```

- [ ] **Step 4: Afficher l'overlay à chaque fin de niveau**

Remplacer la méthode existante `onLevelComplete` :

```ts
  private onLevelComplete(level: 1 | 2 | 3): void {
    if (level >= 3) { this.goMedia(); return; }
    this.levelComplete.show();
  }
```

par :

```ts
  private onLevelComplete(level: 1 | 2 | 3): void {
    // Niveau 3 (victoire finale) : bandeau bravo + « Quitter » uniquement.
    this.levelComplete.show({ showContinue: level < 3 });
  }
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: `TypeScript: No errors found` + build OK.

- [ ] **Step 6: Vérification runtime**

Run: `npm run dev` puis ouvrir `http://localhost:5180`.
Vérifier en jouant (le niveau 1 est le plus rapide : grille 5×5, capacités 9) :
- À la fin du niveau 1 : le bandeau « BRAVO ! » s'affiche avec les 2 boutons (Continuer / Quitter) et une **pluie de paillettes** part des coins haut-gauche et haut-droit.
- Aucun voile/blocage : les boutons Continuer/Quitter restent cliquables (canvas paillettes `pointer-events:none`).
- « Continuer » enchaîne au niveau suivant ; en fin de **niveau 3**, le bandeau bravo s'affiche avec **uniquement** le bouton « Quitter », qui mène à l'écran média.

Expected: comportement ci-dessus observé.

- [ ] **Step 7: Commit**

```bash
git add src/app/App.ts
git commit -m "feat(app): overlay bravo + paillettes à chaque fin de niveau"
```

---

## Self-Review

**Spec coverage :**
- Copie paillettes → Task 1. ✅
- Dépendance tsparticles-confetti → Task 1. ✅
- URLs paillettes/bravo via glob → Task 2. ✅
- Module Confetti plain TS (transcription Confettis.jsx + shapeOptions) → Tasks 3-4. ✅
- 2 salves, params à l'échelle, particleCount 30, 32×32 → Task 3 (testé). ✅
- Refonte overlay avec assets bravo + showContinue → Task 5. ✅
- Déclenchement chaque niveau + victoire finale, niveau 3 = quitter seul → Task 6. ✅
- Préchargement paillettes → Task 4 (`preload`) appelé dans `init` (Task 6 Step 2). ✅
- `ConfettiUtils.js` non transcrit → respecté (aucune tâche). ✅
- Z-index / pointer-events none → Task 4 (style canvas) + vérifié Task 6 Step 6. ✅

**Placeholder scan :** aucun TBD/TODO ; tout le code est fourni.

**Type consistency :** `buildShapeOptions`/`buildBurstParams`/`ShapeOptions`/`BurstParams` (Task 3) utilisés à l'identique en Task 4 ; `Confetti` (`canvas`/`init`/`celebrate`) cohérent Tasks 4→5→6 ; `LevelCompleteOverlay(assets, confetti, callbacks)` + `show({ showContinue })` cohérent Tasks 5→6 ; `getPaillettesUrls`/`getBravoUrl`/`getBravoButtonUrl` cohérent Tasks 2→4→5.
