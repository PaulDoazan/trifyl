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

  // Navigation directe (debug) via les étoiles : relance la partie au niveau choisi.
  private jumpToLevel(level: 1 | 2 | 3): void {
    this.levelComplete.hide();
    this.currentLevel = level;
    this.startLevel(level);
  }

  private startLevel(level: 1 | 2 | 3): void {
    this.disposeCurrentGame();
    const game = new GameScreen(this.pixi, this.assets, level, this.pilesShownRef, {
      onHome: () => this.goHome(),
      onQuit: () => this.goMedia(),
      onLevelComplete: () => this.onLevelComplete(level),
      onJumpToLevel: (lvl) => this.jumpToLevel(lvl),
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
