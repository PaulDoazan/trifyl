import type { Texture } from 'pixi.js';
import type { BinCategory } from '@/game/config-loader';
import type { WasteType } from '@/game/waste';

export type ScreenImageKey = 'veille' | 'home';
export type ButtonKey = 'commencer' | 'quitter' | 'home' | 'touchez';
export type PopupKey = 'piles' | 'textile' | 'verre' | 'combinaison';

export interface AssetProvider {
  init(): Promise<void>;
  getTileTexture(type: WasteType): Texture;
  getGridTexture(level: 1 | 2 | 3): Texture;
  getScreenImageUrl(key: ScreenImageKey): string;
  getButtonUrl(key: ButtonKey): string;
  getPopupUrl(key: PopupKey): string;
  getBinVideUrl(level: 1 | 2 | 3, bin: BinCategory): string;
  getBinPleineUrl(bin: BinCategory): string;
}
