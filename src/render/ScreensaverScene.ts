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
