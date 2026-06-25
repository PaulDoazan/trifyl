import { Container, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { TileSprite } from './TileSprite';
import type { AssetProvider } from '@/assets/AssetProvider';
import type { Grid, Pos } from '@/game/grid';
import type { LevelConfig } from '@/game/levels';
import { ANIM } from '@/app/animation-config';
import { GRID_RECT } from '@/app/config';

export interface GridLayout {
  originX: number;
  originY: number;
  tileW: number;
  tileH: number;
}

export class GridRenderer {
  readonly container: Container;
  readonly hitArea: Graphics;
  private readonly highlight: Graphics;
  private tiles: (TileSprite | null)[][];
  layout: GridLayout;
  private dragTile: TileSprite | null = null;
  private dragHome = { x: 0, y: 0 };
  private dragNeighborCell: Pos | null = null;
  private dragNeighborTile: TileSprite | null = null;
  private dragNeighborHome = { x: 0, y: 0 };

  constructor(
    private readonly level: LevelConfig,
    private readonly assets: AssetProvider,
  ) {
    this.container = new Container();
    this.hitArea = new Graphics();
    this.container.addChild(this.hitArea);
    // Surlignage de la case sélectionnée : sous les tuiles (ajoutées ensuite), au-dessus du fond.
    this.highlight = new Graphics();
    this.highlight.visible = false;
    this.container.addChild(this.highlight);
    this.tiles = Array.from({ length: level.size }, () => Array.from({ length: level.size }, () => null));
    this.layout = this.computeLayout();
    this.drawHitArea();
  }

  /** Met en évidence la case pressée (plus claire) ; null pour l'estomper (fondu). */
  setSelection(pos: Pos | null): void {
    gsap.killTweensOf(this.highlight);
    if (!pos) {
      gsap.to(this.highlight, {
        alpha: 0,
        duration: 0.2,
        ease: 'power1.out',
        onComplete: () => { if (!this.highlight.destroyed) this.highlight.visible = false; },
      });
      return;
    }
    const { originX, originY, tileW, tileH } = this.layout;
    const inset = 4;
    const x = originX + pos.col * tileW + inset;
    const y = originY + pos.row * tileH + inset;
    const w = tileW - inset * 2;
    const h = tileH - inset * 2;
    this.highlight.clear();
    this.highlight.roundRect(x, y, w, h, Math.min(w, h) * 0.16).fill({ color: 0xffffff, alpha: 0.22 });
    this.highlight.alpha = 1;
    this.highlight.visible = true;
  }

  private computeLayout(): GridLayout {
    const n = this.level.size;
    return {
      originX: GRID_RECT.x,
      originY: GRID_RECT.y,
      tileW: GRID_RECT.width / n,
      tileH: GRID_RECT.height / n,
    };
  }

  private drawHitArea(): void {
    const { originX, originY, tileW, tileH } = this.layout;
    const totalW = tileW * this.level.size;
    const totalH = tileH * this.level.size;
    this.hitArea.clear();
    this.hitArea.rect(originX, originY, totalW, totalH).fill({ color: 0x000000, alpha: 0 });
    this.hitArea.eventMode = 'static';
  }

  /** Taille de référence d'une tuile (côté le plus court de la cellule) pour le scale uniforme. */
  private cellSize(): number {
    return Math.min(this.layout.tileW, this.layout.tileH);
  }

  cellToPixel(row: number, col: number): { x: number; y: number } {
    const { originX, originY, tileW, tileH } = this.layout;
    return { x: originX + col * tileW + tileW / 2, y: originY + row * tileH + tileH / 2 };
  }

  pixelToCell(x: number, y: number): Pos | null {
    const { originX, originY, tileW, tileH } = this.layout;
    const col = Math.floor((x - originX) / tileW);
    const row = Math.floor((y - originY) / tileH);
    if (row < 0 || col < 0 || row >= this.level.size || col >= this.level.size) return null;
    return { row, col };
  }

  populate(grid: Grid): void {
    for (let r = 0; r < this.level.size; r++) {
      for (let c = 0; c < this.level.size; c++) {
        const old = this.tiles[r]![c];
        if (old) old.destroy();
        const type = grid[r]![c]!;
        const sprite = new TileSprite(type, this.assets.getTileTexture(type), r, c, this.cellSize());
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

  /** Mémorise le déchet tiré et sa position d'origine (début d'un geste de drag). */
  beginDrag(cell: Pos): void {
    this.dragTile = this.getTile(cell.row, cell.col);
    this.dragHome = this.cellToPixel(cell.row, cell.col);
    this.dragNeighborCell = null;
    this.dragNeighborTile = null;
  }

  /**
   * Suit le doigt : décale le déchet tiré de +offset et le voisin de -offset sur l'axe.
   * `offset` est signé et déjà clampé à ±tile par l'appelant. Si le voisin change
   * (le doigt repasse de l'autre côté), l'ancien voisin est remis à sa place.
   */
  updateDrag(axis: 'x' | 'y', neighbor: Pos | null, offset: number): void {
    if (!this.dragTile) return;

    const changed =
      (neighbor?.row ?? -1) !== (this.dragNeighborCell?.row ?? -1) ||
      (neighbor?.col ?? -1) !== (this.dragNeighborCell?.col ?? -1);
    if (changed) {
      if (this.dragNeighborTile) {
        this.dragNeighborTile.x = this.dragNeighborHome.x;
        this.dragNeighborTile.y = this.dragNeighborHome.y;
      }
      this.dragNeighborCell = neighbor;
      this.dragNeighborTile = neighbor ? this.getTile(neighbor.row, neighbor.col) : null;
      if (neighbor) this.dragNeighborHome = this.cellToPixel(neighbor.row, neighbor.col);
    }

    if (axis === 'x') {
      this.dragTile.x = this.dragHome.x + offset;
      this.dragTile.y = this.dragHome.y;
      if (this.dragNeighborTile) {
        this.dragNeighborTile.x = this.dragNeighborHome.x - offset;
        this.dragNeighborTile.y = this.dragNeighborHome.y;
      }
    } else {
      this.dragTile.y = this.dragHome.y + offset;
      this.dragTile.x = this.dragHome.x;
      if (this.dragNeighborTile) {
        this.dragNeighborTile.y = this.dragNeighborHome.y - offset;
        this.dragNeighborTile.x = this.dragNeighborHome.x;
      }
    }
  }

  /** Ramène le déchet tiré et le voisin à leur place (relâchement sans validation). */
  cancelDrag(): gsap.core.Timeline {
    const tl = gsap.timeline();
    if (this.dragTile) {
      tl.to(this.dragTile, { x: this.dragHome.x, y: this.dragHome.y, ...ANIM.swapValid }, 0);
    }
    if (this.dragNeighborTile) {
      tl.to(
        this.dragNeighborTile,
        { x: this.dragNeighborHome.x, y: this.dragNeighborHome.y, ...ANIM.swapValid },
        0,
      );
    }
    this.clearDrag();
    return tl;
  }

  /** Libère l'état de drag sans bouger les sprites (chemin de validation). */
  endDrag(): void {
    this.clearDrag();
  }

  private clearDrag(): void {
    this.dragTile = null;
    this.dragNeighborCell = null;
    this.dragNeighborTile = null;
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
    const { tileH, originY } = this.layout;
    for (const a of additions) {
      const tex = this.assets.getTileTexture(a.type);
      const sprite = new TileSprite(a.type, tex, a.to.row, a.to.col, this.cellSize());
      const target = this.cellToPixel(a.to.row, a.to.col);
      sprite.x = target.x;
      sprite.y = originY - tileH;
      this.container.addChild(sprite);
      this.tiles[a.to.row]![a.to.col] = sprite;
      tl.to(sprite, { y: target.y, duration: ANIM.refill.duration, ease: 'power2.out' }, 0);
    }
    return tl;
  }
}
