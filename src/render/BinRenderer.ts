import { Container, Sprite, type Texture } from 'pixi.js';
import { gsap } from 'gsap';
import type { AssetProvider } from '@/assets/AssetProvider';
import type { BinKind } from '@/game/waste';
import { ANIM } from '@/app/animation-config';

type RealBin = Exclude<BinKind, 'hazardous'>;

export class BinRenderer {
  readonly container: Container;
  private sprite: Sprite;
  private frames: Texture[];
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
    this.idleTween?.pause();
    const tl = gsap.timeline({
      onComplete: () => {
        this.sprite.y = this.worldY;
        this.idleTween?.resume();
      },
    });
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

  destroy(): void {
    this.idleTween?.kill();
    this.idleTween = null;
    this.container.destroy({ children: true });
  }
}
