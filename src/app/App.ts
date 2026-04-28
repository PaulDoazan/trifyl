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
