import { Texture, type Renderer } from 'pixi.js';
import type { AssetProvider } from './AssetProvider';
import type { BinKind, WasteType } from '@/game/waste';
import { ALL_WASTE_TYPES } from '@/game/waste-data';
import { buildTilePlaceholder, buildBinPlaceholder, generateTexture } from './shapes';

const TILE_SIZE = 256;
const BIN_SIZE = 320;
const BIN_FRAME_COUNT = 8;

export class PlaceholderAssetProvider implements AssetProvider {
  private tiles = new Map<WasteType, Texture>();
  private binIdle = new Map<Exclude<BinKind, 'hazardous'>, Texture>();
  private binFrames = new Map<Exclude<BinKind, 'hazardous'>, Texture[]>();

  constructor(private readonly renderer: Renderer) {}

  async init(): Promise<void> {
    for (const t of ALL_WASTE_TYPES) {
      const c = buildTilePlaceholder(t, TILE_SIZE);
      this.tiles.set(t, generateTexture(this.renderer, c, TILE_SIZE, TILE_SIZE));
    }
    for (const bin of ['yellow', 'black', 'orange'] as const) {
      this.binIdle.set(bin, this.renderBinFrame(bin, 0));
      const frames: Texture[] = [];
      for (let i = 0; i < BIN_FRAME_COUNT; i++) {
        const open = i / (BIN_FRAME_COUNT - 1);
        frames.push(this.renderBinFrame(bin, open));
      }
      this.binFrames.set(bin, frames);
    }
  }

  private renderBinFrame(bin: Exclude<BinKind, 'hazardous'>, openness: number): Texture {
    const c = buildBinPlaceholder(bin, BIN_SIZE, openness);
    return generateTexture(this.renderer, c, BIN_SIZE, BIN_SIZE);
  }

  getTileTexture(type: WasteType): Texture {
    const t = this.tiles.get(type);
    if (!t) throw new Error(`No texture for waste type: ${type}`);
    return t;
  }

  getBinIdleTexture(bin: Exclude<BinKind, 'hazardous'>): Texture {
    const t = this.binIdle.get(bin);
    if (!t) throw new Error(`No idle for bin: ${bin}`);
    return t;
  }

  getBinOpenFrames(bin: Exclude<BinKind, 'hazardous'>): Texture[] {
    const f = this.binFrames.get(bin);
    if (!f) throw new Error(`No frames for bin: ${bin}`);
    return f;
  }
}
