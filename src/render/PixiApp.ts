import { Application, Container } from 'pixi.js';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@/app/config';

export class PixiApp {
  readonly app: Application;
  readonly menuLayer: Container;
  readonly gridLayer: Container;
  readonly fxLayer: Container;

  private constructor(app: Application) {
    this.app = app;
    this.menuLayer = new Container();
    this.gridLayer = new Container();
    this.fxLayer = new Container();
    app.stage.addChild(this.menuLayer, this.gridLayer, this.fxLayer);
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
