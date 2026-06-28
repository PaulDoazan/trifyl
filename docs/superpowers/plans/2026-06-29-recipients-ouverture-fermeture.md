# Animation ouvre / remplit / referme des récipients — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À chaque palier, le récipient de la sidebar s'ouvre (couvercle qui pivote pour le jaune, nœud qui s'écarte en 2 pans pour les sacs), se remplit comme aujourd'hui, puis se referme — généré par code depuis l'unique image fermée.

**Architecture:** Une abstraction `RecipientAnimator` (API neutre `open()/close()/runCycle()`) composée dans `BinGauge`. La géométrie des transforms est dérivée par une fonction pure testable depuis des constantes par couleur. `GameScreen` déclenche un cycle par palier ; les cycles d'un même bac se sérialisent via une file interne, les bacs différents tournent en parallèle.

**Tech Stack:** TypeScript, GSAP (déjà présent), DOM/CSS (BinGauge est HTML), Vitest.

## Global Constraints

- Aucun nouvel asset image : on part de l'image fermée existante (`niv{1,2,3}_poub_*_vide.png`).
- Le système de jauge/paliers existant (`setEtages`, `DASH_FRAC`) n'est pas refondu : on s'y greffe.
- La victoire (`allBinsFull`) reste déclenchée juste après le bump de jauge, sans attendre la fermeture.
- Code et commentaires en français, comme le reste du dépôt.

## File Structure

- Create: `src/render/recipient-geometry.ts` — fonction pure `computeCapGeometry` + table de constantes par couleur. Aucune dépendance DOM/GSAP.
- Create: `src/render/recipient-geometry.test.ts` — tests de la géométrie.
- Create: `src/ui/RecipientAnimator.ts` — pilote l'ouverture/fermeture + file de cycles. Dépend de GSAP, reçoit des éléments DOM.
- Create: `src/ui/RecipientAnimator.test.ts` — tests de la file (sérialisation même bac).
- Modify: `src/app/animation-config.ts` — durées du cycle.
- Modify: `src/ui/BinGauge.ts` — construit les calques coiffe/bouche et instancie `RecipientAnimator`.
- Modify: `src/styles/menu.css` — styles des calques coiffe/bouche.
- Modify: `src/ui/HUD.ts` — expose `runBinCycle(bin, …)`.
- Modify: `src/ui/screens/GameScreen.ts` — orchestre le cycle par palier.

---

### Task 1: Géométrie des transforms (pur)

**Files:**
- Create: `src/render/recipient-geometry.ts`
- Test: `src/render/recipient-geometry.test.ts`

**Interfaces:**
- Produces:
  - `type RecipientKind = 'lid' | 'flaps'`
  - `interface CapConfig { kind: RecipientKind; capFrac: number; openAngleDeg: number }`
  - `const CAP_CONFIG: Record<'yellow'|'black'|'orange', CapConfig>`
  - `interface CapGeometry { capHeightPx: number; lid?: { originPct: string; openTransform: string }; flaps?: { left: { originPct: string; openTransform: string }; right: { originPct: string; openTransform: string } }; mouth: { heightPx: number; bottomPx: number } }`
  - `function computeCapGeometry(binW: number, binH: number, cfg: CapConfig): CapGeometry`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { computeCapGeometry, CAP_CONFIG } from './recipient-geometry';

describe('computeCapGeometry', () => {
  it('lid: hauteur de coiffe = capFrac * binH et pivot arrière (origin en haut)', () => {
    const g = computeCapGeometry(200, 250, CAP_CONFIG.yellow);
    expect(g.capHeightPx).toBeCloseTo(250 * CAP_CONFIG.yellow.capFrac, 3);
    expect(g.lid).toBeDefined();
    expect(g.lid!.originPct).toBe('50% 100%'); // charnière = arête basse de la bande
    expect(g.lid!.openTransform).toContain(`rotateX(${CAP_CONFIG.yellow.openAngleDeg}deg)`);
    expect(g.flaps).toBeUndefined();
  });

  it('flaps: deux pans symétriques pivotant vers l’extérieur', () => {
    const g = computeCapGeometry(200, 250, CAP_CONFIG.black);
    expect(g.flaps).toBeDefined();
    const a = CAP_CONFIG.black.openAngleDeg;
    expect(g.flaps!.left.originPct).toBe('100% 100%');  // charnière interne (centre-bas)
    expect(g.flaps!.right.originPct).toBe('0% 100%');
    expect(g.flaps!.left.openTransform).toContain(`rotate(-${a}deg)`);
    expect(g.flaps!.right.openTransform).toContain(`rotate(${a}deg)`);
    expect(g.lid).toBeUndefined();
  });

  it('bouche dimensionnée sous la coiffe', () => {
    const g = computeCapGeometry(200, 250, CAP_CONFIG.orange);
    expect(g.mouth.heightPx).toBeGreaterThan(0);
    expect(g.mouth.bottomPx).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/render/recipient-geometry.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation**

```typescript
export type RecipientKind = 'lid' | 'flaps';

export interface CapConfig {
  /** 'lid' = couvercle qui pivote (jaune) ; 'flaps' = nœud qui s'écarte en 2 pans (sacs). */
  kind: RecipientKind;
  /** Fraction de la hauteur du récipient occupée par la coiffe animée (depuis le haut). */
  capFrac: number;
  /** Angle d'ouverture (deg). Pivot couvercle pour 'lid', écartement par pan pour 'flaps'. */
  openAngleDeg: number;
}

// Valeurs posées « à l'œil » sur les PNG fermés, à affiner visuellement.
export const CAP_CONFIG: Record<'yellow' | 'black' | 'orange', CapConfig> = {
  yellow: { kind: 'lid', capFrac: 0.14, openAngleDeg: 105 },
  black: { kind: 'flaps', capFrac: 0.22, openAngleDeg: 28 },
  orange: { kind: 'flaps', capFrac: 0.2, openAngleDeg: 32 },
};

export interface CapGeometry {
  capHeightPx: number;
  lid?: { originPct: string; openTransform: string };
  flaps?: {
    left: { originPct: string; openTransform: string };
    right: { originPct: string; openTransform: string };
  };
  mouth: { heightPx: number; bottomPx: number };
}

export function computeCapGeometry(binW: number, binH: number, cfg: CapConfig): CapGeometry {
  const capHeightPx = binH * cfg.capFrac;
  // La bouche sombre occupe ~60 % de la coiffe, sous celle-ci.
  const mouth = { heightPx: capHeightPx * 0.6, bottomPx: 0 };

  if (cfg.kind === 'lid') {
    return {
      capHeightPx,
      lid: {
        originPct: '50% 100%',
        openTransform: `perspective(600px) rotateX(${cfg.openAngleDeg}deg)`,
      },
      mouth,
    };
  }
  const a = cfg.openAngleDeg;
  return {
    capHeightPx,
    flaps: {
      left: { originPct: '100% 100%', openTransform: `rotate(-${a}deg)` },
      right: { originPct: '0% 100%', openTransform: `rotate(${a}deg)` },
    },
    mouth,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/render/recipient-geometry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render/recipient-geometry.ts src/render/recipient-geometry.test.ts
git commit -m "feat(render): géométrie pure des transforms d'ouverture des récipients"
```

---

### Task 2: `RecipientAnimator` + file de cycles

**Files:**
- Create: `src/ui/RecipientAnimator.ts`
- Test: `src/ui/RecipientAnimator.test.ts`
- Modify: `src/app/animation-config.ts`

**Interfaces:**
- Consumes: `CapGeometry` (Task 1).
- Produces:
  - `interface RecipientElements { caps: HTMLElement[]; mouth: HTMLElement }`
  - `interface CycleHooks { onOpened: () => void }`
  - `class RecipientAnimator { constructor(els, geo, openTransforms: string[]); open(): gsap.core.Timeline; close(): gsap.core.Timeline; runCycle(hooks: CycleHooks): Promise<void> }`
  - `runCycle` sérialise : les appels successifs sur la MÊME instance s'enchaînent sans chevauchement.

- [ ] **Step 1: Add durations to animation-config**

Modify `src/app/animation-config.ts` — remplacer la ligne `binOpen: { duration: 0.5 },` par :

```typescript
  recipientCycle: { openDur: 0.25, holdDur: 0.15, closeDur: 0.25 },
```

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { gsap } from 'gsap';
import { RecipientAnimator } from './RecipientAnimator';

function makeAnimator() {
  const cap = document.createElement('div');
  const mouth = document.createElement('div');
  const geo = { capHeightPx: 30, mouth: { heightPx: 18, bottomPx: 0 } } as any;
  return new RecipientAnimator({ caps: [cap], mouth }, geo, ['rotate(20deg)']);
}

describe('RecipientAnimator', () => {
  it('runCycle appelle onOpened une fois, après l’ouverture', async () => {
    gsap.globalTimeline.timeScale(1000); // accélère les tweens pour le test
    const a = makeAnimator();
    const onOpened = vi.fn();
    await a.runCycle({ onOpened });
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it('sérialise les cycles d’une même instance (pas de chevauchement)', async () => {
    gsap.globalTimeline.timeScale(1000);
    const a = makeAnimator();
    const order: string[] = [];
    const p1 = a.runCycle({ onOpened: () => order.push('open1') }).then(() => order.push('done1'));
    const p2 = a.runCycle({ onOpened: () => order.push('open2') });
    await Promise.all([p1, p2]);
    expect(order).toEqual(['open1', 'done1', 'open2']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/ui/RecipientAnimator.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 4: Write minimal implementation**

```typescript
import { gsap } from 'gsap';
import type { CapGeometry } from '@/render/recipient-geometry';
import { ANIM } from '@/app/animation-config';

export interface RecipientElements {
  /** Calque(s) animé(s) : 1 pour 'lid', 2 (gauche, droite) pour 'flaps'. */
  caps: HTMLElement[];
  /** Bouche sombre révélée derrière la coiffe. */
  mouth: HTMLElement;
}

export interface CycleHooks {
  /** Appelé une fois le récipient ouvert (c'est là qu'on remplit la jauge). */
  onOpened: () => void;
}

export class RecipientAnimator {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly els: RecipientElements,
    private readonly geo: CapGeometry,
    /** Transform CSS d'ouverture, un par calque (même ordre que els.caps). */
    private readonly openTransforms: string[],
  ) {}

  open(): gsap.core.Timeline {
    const { openDur } = ANIM.recipientCycle;
    const tl = gsap.timeline();
    this.els.caps.forEach((cap, i) => {
      tl.to(cap, { transform: this.openTransforms[i], duration: openDur, ease: 'back.in(1.4)' }, 0);
    });
    tl.fromTo(this.els.mouth, { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: openDur, ease: 'power1.out' }, 0);
    return tl;
  }

  close(): gsap.core.Timeline {
    const { closeDur } = ANIM.recipientCycle;
    const tl = gsap.timeline();
    this.els.caps.forEach((cap) => {
      tl.to(cap, { transform: 'none', duration: closeDur, ease: 'power2.out' }, 0);
    });
    tl.to(this.els.mouth, { scaleY: 0, autoAlpha: 0, duration: closeDur, ease: 'power1.in' }, 0);
    return tl;
  }

  /** Ouvre → onOpened (remplissage) → maintien → referme. Sérialisé par instance. */
  runCycle(hooks: CycleHooks): Promise<void> {
    const run = async () => {
      await this.open().then();
      hooks.onOpened();
      const { holdDur } = ANIM.recipientCycle;
      await gsap.to({}, { duration: holdDur }).then();
      await this.close().then();
    };
    this.tail = this.tail.then(run, run);
    return this.tail;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/ui/RecipientAnimator.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/ui/RecipientAnimator.ts src/ui/RecipientAnimator.test.ts src/app/animation-config.ts
git commit -m "feat(ui): RecipientAnimator (cycle ouvre/maintien/referme sérialisé)"
```

---

### Task 3: Calques coiffe/bouche dans BinGauge + CSS

**Files:**
- Modify: `src/ui/BinGauge.ts`
- Modify: `src/styles/menu.css`

**Interfaces:**
- Consumes: `computeCapGeometry`, `CAP_CONFIG` (Task 1) ; `RecipientAnimator` (Task 2).
- Produces: `BinGauge.animator: RecipientAnimator` (public readonly).

- [ ] **Step 1: Add CSS**

Ajouter à `src/styles/menu.css` après le bloc `.bin-gauge__fill { … }` :

```css
/* Calques d'ouverture : fenêtrage du haut de l'image fermée (coiffe) + bouche sombre. */
.bin-gauge__mouth {
  position: absolute; left: 0; width: 100%;
  background: radial-gradient(ellipse at center, #2b2b2b 0%, #2b2b2b 60%, transparent 75%);
  transform-origin: center bottom;
  opacity: 0; pointer-events: none;
}
.bin-gauge__cap {
  position: absolute; top: 0; width: 100%;
  background-repeat: no-repeat;
  overflow: hidden;
  pointer-events: none;
  will-change: transform;
}
.bin-gauge__cap--left { left: 0; width: 50%; }
.bin-gauge__cap--right { right: 0; left: auto; width: 50%; }
```

- [ ] **Step 2: Wire layers in BinGauge constructor**

Dans `src/ui/BinGauge.ts` : importer en tête —

```typescript
import { computeCapGeometry, CAP_CONFIG } from '@/render/recipient-geometry';
import { RecipientAnimator } from './RecipientAnimator';
```

Ajouter le champ public dans la classe (sous `private heightK: number;`) :

```typescript
  readonly animator: RecipientAnimator;
```

À la fin du constructeur, juste avant `this.root = el;`, insérer la construction des calques. `binW`, `binH`, `videUrl`, `geo` (objet GEO), `s`, `box` sont déjà en portée :

```typescript
    // --- Calques d'ouverture (coiffe + bouche), fenêtrés sur l'image fermée ---
    const cap = CAP_CONFIG[bin];
    const capGeo = computeCapGeometry(binW, binH, cap);
    const binLeft = (box.width - binW) / 2; // « vide » est centré dans la boîte
    const capTop = box.height - binH;       // l'image est calée en bas (center bottom)

    // Bouche sombre, juste sous la coiffe.
    const mouth = document.createElement('div');
    mouth.className = 'bin-gauge__mouth';
    mouth.style.left = `${binLeft}px`;
    mouth.style.width = `${binW}px`;
    mouth.style.height = `${capGeo.mouth.heightPx}px`;
    mouth.style.top = `${capTop + capGeo.capHeightPx - capGeo.mouth.heightPx / 2}px`;

    // Fabrique un calque « coiffe » fenêtré sur le haut de l'image fermée.
    const makeCap = (variant: '' | 'left' | 'right'): HTMLElement => {
      const c = document.createElement('div');
      c.className = 'bin-gauge__cap' + (variant ? ` bin-gauge__cap--${variant}` : '');
      c.style.height = `${capGeo.capHeightPx}px`;
      c.style.top = `${capTop}px`;
      if (!variant) c.style.left = `${binLeft}px`;
      c.style.width = variant ? `${binW / 2}px` : `${binW}px`;
      if (variant === 'left') c.style.left = `${binLeft}px`;
      if (variant === 'right') c.style.left = `${binLeft + binW / 2}px`;
      // Même image/cadrage que « vide » : on voit le haut, le reste est clippé par overflow.
      c.style.backgroundImage = `url("${videUrl}")`;
      c.style.backgroundSize = `${binW}px ${binH}px`;
      c.style.backgroundPosition = variant === 'right' ? `${-binW / 2}px top` : 'left top';
      return c;
    };

    let caps: HTMLElement[];
    let transforms: string[];
    if (capGeo.lid) {
      const lid = makeCap('');
      lid.style.transformOrigin = capGeo.lid.originPct;
      caps = [lid];
      transforms = [capGeo.lid.openTransform];
    } else {
      const left = makeCap('left');
      const right = makeCap('right');
      left.style.transformOrigin = capGeo.flaps!.left.originPct;
      right.style.transformOrigin = capGeo.flaps!.right.originPct;
      caps = [left, right];
      transforms = [capGeo.flaps!.left.openTransform, capGeo.flaps!.right.openTransform];
    }

    el.appendChild(mouth);
    for (const c of caps) el.appendChild(c);
    this.animator = new RecipientAnimator({ caps, mouth }, capGeo, transforms);
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: pas d'erreur de type.

- [ ] **Step 4: Commit**

```bash
git add src/ui/BinGauge.ts src/styles/menu.css
git commit -m "feat(ui): calques coiffe/bouche + animator dans BinGauge"
```

---

### Task 4: Exposer le cycle via HUD

**Files:**
- Modify: `src/ui/HUD.ts`

**Interfaces:**
- Consumes: `BinGauge.animator` (Task 3), `CycleHooks` (Task 2).
- Produces: `HUD.runBinCycle(bin: BinCategory, onOpened: () => void): Promise<void>`

- [ ] **Step 1: Add method**

Dans `src/ui/HUD.ts`, ajouter après `binMaxEtages` :

```typescript
  /** Joue le cycle ouvre→remplit→referme du bac ; onOpened est appelé une fois ouvert. */
  runBinCycle(bin: BinCategory, onOpened: () => void): Promise<void> {
    return this.gauges[bin].animator.runCycle({ onOpened });
  }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add src/ui/HUD.ts
git commit -m "feat(ui): HUD.runBinCycle expose le cycle d'ouverture du bac"
```

---

### Task 5: Orchestration du cycle par palier dans GameScreen

**Files:**
- Modify: `src/ui/screens/GameScreen.ts:141-173`

**Interfaces:**
- Consumes: `HUD.runBinCycle` (Task 4), `flyTileToBin`, `trapVortex`, `ejectTilesAt`.

- [ ] **Step 1: Remplacer la boucle `for (const event of result.events)`**

Remplacer le corps actuel (lignes ~141-173) par : le déchet vole pendant que le bac est ouvert, le bump se fait dans `onOpened`, la victoire est testée là, puis on referme.

```typescript
    for (const event of result.events) {
      // Effets non liés à un bac (spéciaux + éjections d'obstacles) en parallèle.
      const sideTl = gsap.timeline();
      for (const m of event.step.matches) {
        if (!isSpecialCategory(m.category)) continue;
        for (const s of this.grid.removeTilesAt(m.cells)) sideTl.add(trapVortex(s), 0);
      }
      sideTl.add(this.grid.ejectTilesAt(event.step.ejected), 0);

      // Un cycle ouvre→remplit→referme par combo de tri. Même bac = sérialisé (file interne).
      const cycles: Promise<void>[] = [];
      for (const m of event.step.matches) {
        if (isSpecialCategory(m.category)) continue;
        const cat = m.category as BinCategory;
        const sprites = this.grid.removeTilesAt(m.cells);
        const target = { x: MENU_WIDTH * 0.5, y: BIN_HUD_Y[cat] };
        cycles.push(
          this.hud.runBinCycle(cat, () => {
            // Le déchet a volé pendant l'ouverture ; à l'arrivée on monte d'un étage.
            const fly = gsap.timeline();
            for (const s of sprites) fly.add(flyTileToBin(s, target), 0);
            this.binCombos[cat] += 1;
            this.hud.setEtages(cat, this.binCombos[cat]);
            // Victoire dès que les bacs sont pleins, sans attendre les fermetures.
            if (this.allBinsFull() && !this.finished) {
              this.finished = true;
              this.input.setEnabled(false);
              this.callbacks.onLevelComplete();
            }
          }),
        );
      }

      await Promise.all([sideTl.then(), ...cycles]);
      if (this.finished) return;
      await this.grid.applyDrops(event.step.drops).then();
      await this.grid.applyRefill(event.step.refill).then();
      this.maybeShowSpecial(event.specials);
    }
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: pas d'erreur.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: tous les tests passent.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, lancer un niveau, faire un combo par couleur ; vérifier : le bac s'ouvre, le déchet entre, la jauge monte, le bac se referme ; pas de clignotement ni de chevauchement sur paliers enchaînés.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/GameScreen.ts
git commit -m "feat(game): cycle ouvre/remplit/referme des bacs à chaque palier"
```

---

## Self-Review

- **Couverture spec :** principe visuel (Task 1+3), abstraction RecipientAnimator + file (Task 2), restructuration DOM BinGauge (Task 3), orchestration par palier (Task 5), config durées (Task 2), tests géométrie + file (Task 1, 2). ✓
- **Victoire sans attendre la fermeture :** testée dans `onOpened` (Task 5), avant `Promise.all`. ✓
- **Pas de placeholder :** toutes les étapes contiennent le code réel. ✓
- **Cohérence des types :** `runCycle(hooks: CycleHooks)`, `runBinCycle(bin, onOpened)`, `computeCapGeometry`/`CAP_CONFIG`, `BinGauge.animator` — noms constants entre tâches. ✓
