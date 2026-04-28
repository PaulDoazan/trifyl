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
