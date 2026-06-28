import { gsap } from 'gsap';
import { Container, Sprite } from 'pixi.js';
import type { PixiApp } from '@/render/PixiApp';
import type { AssetProvider } from '@/assets/AssetProvider';
import { GridRenderer } from '@/render/GridRenderer';
import { flyTileToBin } from '@/render/FlightAnimator';
import { trapVortex } from '@/render/TrapEffect';
import { HUD } from '@/ui/HUD';
import { EduOverlay } from '@/ui/overlays/EduOverlay';
import { EndOverlay } from '@/ui/overlays/EndOverlay';
import { Toast } from '@/ui/overlays/Toast';
import { InputRouter } from '@/input/InputRouter';
import { applySwap, createGameState, type GameState } from '@/game/GameState';
import { reshuffleGrid } from '@/game/reshuffle';
import { getLevelConfig } from '@/game/levels';
import { createPrng } from '@/game/prng';
import { isSpecialCategory, BIN_CATEGORIES, type BinCategory, type SpecialCategory } from '@/game/config-loader';
import type { Pos } from '@/game/grid';
import { MENU_WIDTH, STAGE_HEIGHT, STAGE_WIDTH } from '@/app/config';

export interface GameScreenCallbacks {
  onHome: () => void;
  onQuit: () => void;
  onLevelComplete: () => void;
  onJumpToLevel: (level: 1 | 2 | 3) => void;
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
  private toast: Toast;
  private input: InputRouter;
  private prng: ReturnType<typeof createPrng>;
  private animating = false;
  private finished = false;
  // Nombre de combos déposés par poubelle : 1 combo = 1 étage (indépendant du nombre de déchets).
  private binCombos: Record<BinCategory, number> = { yellow: 0, black: 0, orange: 0 };

  constructor(
    private readonly pixi: PixiApp,
    private readonly assets: AssetProvider,
    level: 1 | 2 | 3,
    private readonly pilesShownRef: { value: boolean },
    private readonly callbacks: GameScreenCallbacks,
  ) {
    this.prng = createPrng((Date.now() ^ (level * 2654435761)) >>> 0);
    this.state = createGameState(getLevelConfig(level), this.prng);

    this.pixiContainer = new Container();

    // Fond plein écran (design complet de l'écran de jeu) derrière les tuiles.
    const bg = new Sprite(assets.getGridTexture(level));
    bg.x = 0; bg.y = 0; bg.width = STAGE_WIDTH; bg.height = STAGE_HEIGHT;
    this.pixiContainer.addChild(bg);

    this.grid = new GridRenderer(this.state.config, assets);
    this.grid.populate(this.state.grid);
    this.pixiContainer.addChild(this.grid.container);

    this.hud = new HUD(level, assets, assets.getButtonUrl('home'), assets.getButtonUrl('quitter'), {
      onHome: () => callbacks.onHome(),
      onQuit: () => callbacks.onQuit(),
      onSelectLevel: (lvl) => callbacks.onJumpToLevel(lvl),
    });
    this.edu = new EduOverlay();
    this.end = new EndOverlay(assets.getPopupUrl('combinaison'), () => callbacks.onQuit());
    this.toast = new Toast();

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
    playArea.appendChild(this.toast.root);
    el.appendChild(playArea);
    this.root = el;

    this.input = new InputRouter(this.grid);
    this.input.onSwap((intent) => this.handleSwap(intent.a, intent.b));

    this.pixi.gridLayer.addChild(this.pixiContainer);
    this.pixi.app.canvas.style.pointerEvents = 'auto';
  }

  private maybeShowSpecial(specials: SpecialCategory[]): void {
    for (const cat of specials) {
      if (cat === 'piles') {
        if (this.pilesShownRef.value) continue;
        this.pilesShownRef.value = true;
      }
      this.edu.show(this.assets.getPopupUrl(cat));
      return; // un message à la fois
    }
  }

  private refreshGauges(): void {
    for (const bin of BIN_CATEGORIES) {
      this.hud.setEtages(bin, this.binCombos[bin]);
    }
  }

  /** Niveau terminé : chaque poubelle a reçu assez de combos pour remplir tous ses étages. */
  private allBinsFull(): boolean {
    return BIN_CATEGORIES.every((bin) => this.binCombos[bin] >= this.hud.binMaxEtages(bin));
  }

  private async handleSwap(a: Pos, b: Pos): Promise<void> {
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
        const cat = m.category;
        const sprites = this.grid.removeTilesAt(m.cells);
        if (isSpecialCategory(cat)) {
          for (const s of sprites) tl.add(trapVortex(s), 0);
        } else {
          const target = { x: MENU_WIDTH * 0.5, y: BIN_HUD_Y[cat as BinCategory] };
          for (const s of sprites) tl.add(flyTileToBin(s, target), 0);
        }
      }
      // Obstacles arrivés en dernière ligne : ils tombent hors de la grille.
      tl.add(this.grid.ejectTilesAt(event.step.ejected), 0);
      await tl.then();
      // Les déchets viennent d'atterrir dans la poubelle → on monte d'UN étage par combo.
      for (const m of event.step.matches) {
        if (isSpecialCategory(m.category)) continue;
        const cat = m.category as BinCategory;
        this.binCombos[cat] += 1;
        this.hud.setEtages(cat, this.binCombos[cat]);
      }
      // Victoire dès que les poubelles sont pleines, sans attendre la fin des cascades.
      if (this.allBinsFull() && !this.finished) {
        this.finished = true;
        this.input.setEnabled(false);
        this.callbacks.onLevelComplete();
        return;
      }
      await this.grid.applyDrops(event.step.drops).then();
      await this.grid.applyRefill(event.step.refill).then();
      this.maybeShowSpecial(event.specials);
    }

    this.state = result.next;
    this.refreshGauges();

    // Plus aucun coup possible : on redistribue la grille (pas de défaite).
    if (this.state.isOver) {
      await this.reshuffleBoard();
    }

    this.animating = false;
    this.input.setEnabled(true);
  }

  /** Rebat la grille en conservant la progression, avec un message, quand le joueur est bloqué. */
  private async reshuffleBoard(): Promise<void> {
    this.toast.show('On redistribue la grille !');
    const newGrid = reshuffleGrid(this.state.grid, this.state.config, this.prng);
    this.state = { ...this.state, grid: newGrid, isOver: false };
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    this.grid.populate(newGrid);
  }

  destroy(): void {
    this.pixi.gridLayer.removeChild(this.pixiContainer);
    this.pixiContainer.destroy({ children: true });
    this.hud.destroy();
    this.root.remove();
    this.pixi.app.canvas.style.pointerEvents = 'none';
  }
}
