import type { Texture } from 'pixi.js';
import type { BinKind, WasteType } from '@/game/waste';

export interface AssetProvider {
  init(): Promise<void>;
  getTileTexture(type: WasteType): Texture;
  getBinIdleTexture(bin: Exclude<BinKind, 'hazardous'>): Texture;
  getBinOpenFrames(bin: Exclude<BinKind, 'hazardous'>): Texture[];
}
