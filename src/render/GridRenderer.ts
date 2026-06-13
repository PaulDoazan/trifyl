import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { TileSprite } from './TileSprite';
import type { AssetProvider } from '@/assets/AssetProvider';
import type { Grid, Pos } from '@/game/grid';
import type { LevelConfig } from '@/game/levels';
import { ANIM } from '@/app/animation-config';
import { GRID_PADDING, PLAY_AREA_HEIGHT, PLAY_AREA_WIDTH, PLAY_AREA_X } from '@/app/config';

export interface GridLayout {
  originX: number;
  originY: number;
  tileSize: number;
}

export class GridRenderer {
  readonly container: Container;
  readonly hitArea: Graphics;
  private tiles: (TileSprite | null)[][];
  layout: GridLayout;

  constructor(
    private readonly level: LevelConfig,
    private readonly assets: AssetProvider,
  ) {
    this.container = new Container();
    this.hitArea = new Graphics();
    this.container.addChild(this.hitArea);
    this.tiles = Array.from({ length: level.size }, () => Array.from({ length: level.size }, () => null));
    this.layout = this.computeLayout();
    this.drawHitArea();
  }

  setBackground(texture: Texture): void {
    const { originX, originY, tileSize } = this.layout;
    const total = tileSize * this.level.size;
    const bg = new Sprite(texture);
    bg.x = originX; bg.y = originY; bg.width = total; bg.height = total;
    this.container.addChildAt(bg, 0);
  }

  private computeLayout(): GridLayout {
    const available = Math.min(PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT) - GRID_PADDING * 2;
    const tileSize = Math.floor(available / this.level.size);
    const total = tileSize * this.level.size;
    const originX = PLAY_AREA_X + (PLAY_AREA_WIDTH - total) / 2;
    const originY = (PLAY_AREA_HEIGHT - total) / 2;
    return { originX, originY, tileSize };
  }

  private drawHitArea(): void {
    const { originX, originY, tileSize } = this.layout;
    const total = tileSize * this.level.size;
    this.hitArea.clear();
    this.hitArea.rect(originX, originY, total, total).fill({ color: 0x000000, alpha: 0 });
    this.hitArea.eventMode = 'static';
  }

  cellToPixel(row: number, col: number): { x: number; y: number } {
    const { originX, originY, tileSize } = this.layout;
    return { x: originX + col * tileSize + tileSize / 2, y: originY + row * tileSize + tileSize / 2 };
  }

  pixelToCell(x: number, y: number): Pos | null {
    const { originX, originY, tileSize } = this.layout;
    const col = Math.floor((x - originX) / tileSize);
    const row = Math.floor((y - originY) / tileSize);
    if (row < 0 || col < 0 || row >= this.level.size || col >= this.level.size) return null;
    return { row, col };
  }

  populate(grid: Grid): void {
    for (let r = 0; r < this.level.size; r++) {
      for (let c = 0; c < this.level.size; c++) {
        const old = this.tiles[r]![c];
        if (old) old.destroy();
        const type = grid[r]![c]!;
        const sprite = new TileSprite(type, this.assets.getTileTexture(type), r, c, this.layout.tileSize);
        const { x, y } = this.cellToPixel(r, c);
        sprite.x = x;
        sprite.y = y;
        this.container.addChild(sprite);
        this.tiles[r]![c] = sprite;
      }
    }
  }

  getTile(row: number, col: number): TileSprite | null {
    return this.tiles[row]?.[col] ?? null;
  }

  setTile(row: number, col: number, tile: TileSprite | null): void {
    this.tiles[row]![col] = tile;
    if (tile) {
      tile.row = row;
      tile.col = col;
    }
  }

  swapVisual(a: Pos, b: Pos): gsap.core.Timeline {
    const ta = this.getTile(a.row, a.col)!;
    const tb = this.getTile(b.row, b.col)!;
    const pa = this.cellToPixel(a.row, a.col);
    const pb = this.cellToPixel(b.row, b.col);
    const tl = gsap.timeline();
    tl.to(ta, { x: pb.x, y: pb.y, ...ANIM.swapValid }, 0);
    tl.to(tb, { x: pa.x, y: pa.y, ...ANIM.swapValid }, 0);
    return tl;
  }

  swapAndUndo(a: Pos, b: Pos): gsap.core.Timeline {
    const ta = this.getTile(a.row, a.col)!;
    const tb = this.getTile(b.row, b.col)!;
    const pa = this.cellToPixel(a.row, a.col);
    const pb = this.cellToPixel(b.row, b.col);
    const tl = gsap.timeline();
    tl.to(ta, { x: pb.x, y: pb.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.out' }, 0);
    tl.to(tb, { x: pa.x, y: pa.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.out' }, 0);
    tl.to(ta, { x: pa.x, y: pa.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.in' });
    tl.to(tb, { x: pb.x, y: pb.y, duration: ANIM.swapInvalid.duration / 2, ease: 'power2.in' }, '<');
    return tl;
  }

  applySwapInModel(a: Pos, b: Pos): void {
    const ta = this.getTile(a.row, a.col);
    const tb = this.getTile(b.row, b.col);
    this.setTile(a.row, a.col, tb);
    this.setTile(b.row, b.col, ta);
  }

  removeTilesAt(positions: Pos[]): TileSprite[] {
    const out: TileSprite[] = [];
    for (const p of positions) {
      const t = this.getTile(p.row, p.col);
      if (t) {
        out.push(t);
        this.setTile(p.row, p.col, null);
      }
    }
    return out;
  }

  applyDrops(drops: { from: Pos; to: Pos }[]): gsap.core.Timeline {
    const tl = gsap.timeline();
    const moved = new Map<TileSprite, Pos>();
    for (const d of drops) {
      const sprite = this.tiles[d.from.row]?.[d.from.col];
      if (!sprite) continue;
      this.tiles[d.from.row]![d.from.col] = null;
      moved.set(sprite, d.to);
    }
    for (const [sprite, to] of moved) {
      this.tiles[to.row]![to.col] = sprite;
      sprite.row = to.row;
      sprite.col = to.col;
      const { x, y } = this.cellToPixel(to.row, to.col);
      tl.to(sprite, { x, y, duration: ANIM.cascadeDropPerCell, ease: 'bounce.out' }, 0);
    }
    return tl;
  }

  applyRefill(additions: { to: Pos; type: import('@/game/waste').WasteType }[]): gsap.core.Timeline {
    const tl = gsap.timeline();
    const { tileSize, originY } = this.layout;
    for (const a of additions) {
      const tex = this.assets.getTileTexture(a.type);
      const sprite = new TileSprite(a.type, tex, a.to.row, a.to.col, tileSize);
      const target = this.cellToPixel(a.to.row, a.to.col);
      sprite.x = target.x;
      sprite.y = originY - tileSize;
      this.container.addChild(sprite);
      this.tiles[a.to.row]![a.to.col] = sprite;
      tl.to(sprite, { y: target.y, duration: ANIM.refill.duration, ease: 'power2.out' }, 0);
    }
    return tl;
  }
}
