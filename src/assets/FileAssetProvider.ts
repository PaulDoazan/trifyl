import { Assets, Texture } from 'pixi.js';
import type { AssetProvider, ScreenImageKey, ButtonKey, PopupKey } from './AssetProvider';
import type { BinCategory } from '@/game/config-loader';
import type { WasteType } from '@/game/waste';
import { WASTE_META, ALL_WASTE_TYPES } from '@/game/waste-data';
import { OBSTACLE_TYPE } from '@/game/obstacle';

/** Texture placeholder de l'obstacle, dessinée par code (bloc neutre + symbole « interdit »). */
function makeObstacleTexture(): Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#39424d';
  ctx.strokeStyle = '#5b6675';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(8, 8, size - 16, size - 16, 22);
  ctx.fill();
  ctx.stroke();
  const cx = size / 2, cy = size / 2, rad = 32;
  ctx.strokeStyle = '#e2574c';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  const d = rad * Math.SQRT1_2;
  ctx.beginPath();
  ctx.moveTo(cx - d, cy - d);
  ctx.lineTo(cx + d, cy + d);
  ctx.stroke();
  return Texture.from(canvas);
}

// URL de chaque PNG sous src/assets/files (résolu par Vite au build).
const FILES = import.meta.glob('./files/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

function url(relative: string): string {
  const key = `./files/${relative}.png`;
  const u = FILES[key];
  if (!u) throw new Error(`asset introuvable: ${key}`);
  return u;
}

const BIN_FILE: Record<BinCategory, string> = { yellow: 'jaune', black: 'noire', orange: 'orange' };

export class FileAssetProvider implements AssetProvider {
  private tiles = new Map<WasteType, Texture>();
  private grids = new Map<number, Texture>();

  async init(): Promise<void> {
    for (const t of ALL_WASTE_TYPES) {
      this.tiles.set(t, await Assets.load(url(WASTE_META[t]!.asset)));
    }
    this.tiles.set(OBSTACLE_TYPE, makeObstacleTexture());
    for (const lvl of [1, 2, 3] as const) {
      this.grids.set(lvl, await Assets.load(url(`grille/grille_niv${lvl}`)));
    }
  }

  getTileTexture(type: WasteType): Texture {
    const t = this.tiles.get(type);
    if (!t) throw new Error(`pas de texture pour ${type}`);
    return t;
  }

  getGridTexture(level: 1 | 2 | 3): Texture { return this.grids.get(level)!; }

  getScreenImageUrl(key: ScreenImageKey): string {
    return key === 'veille' ? url('veille/veille') : url('home/home');
  }
  getButtonUrl(key: ButtonKey): string { return url(`boutons/${key}`); }
  getPopupUrl(key: PopupKey): string { return url(`pop up/${key}`); }
  getBinVideUrl(level: 1 | 2 | 3, bin: BinCategory): string {
    return url(`poubelles/niv${level}_poub_${BIN_FILE[bin]}_vide`);
  }
  getBinPleineUrl(bin: BinCategory): string {
    return url(`poubelles/poub_${BIN_FILE[bin]}_pleine`);
  }
}
