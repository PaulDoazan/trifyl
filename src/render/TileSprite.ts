import { Sprite, type Texture } from 'pixi.js';
import type { WasteType } from '@/game/waste';

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
    this.width = size;
    this.height = size;
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }
}
