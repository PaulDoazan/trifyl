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
