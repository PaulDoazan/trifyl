import { Sprite, type Texture } from 'pixi.js';
import type { WasteType } from '@/game/waste';

// Part de la case occupée par la tuile (laisse une marge dans chaque cellule).
const CELL_FILL = 0.85;

export class TileSprite extends Sprite {
  type: WasteType;
  row: number;
  col: number;

  constructor(type: WasteType, texture: Texture, row: number, col: number, size: number) {
    super(texture);
    this.type = type;
    this.row = row;
    this.col = col;
    this.anchor.set(0.5);
    // Scale uniforme : on conserve le ratio d'origine du PNG, sans déformation X/Y.
    // Le plus grand côté tient dans (size * CELL_FILL) ; l'ancre 0.5 centre la tuile dans sa case.
    const longest = Math.max(texture.width, texture.height) || size;
    this.scale.set((size * CELL_FILL) / longest);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }
}
