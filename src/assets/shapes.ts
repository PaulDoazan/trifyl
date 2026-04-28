import { Graphics, Text, Container, type Renderer, RenderTexture } from 'pixi.js';
import type { WasteType, BinKind } from '@/game/waste';
import { WASTE_META } from '@/game/waste-data';

const BIN_COLORS: Record<BinKind, number> = {
  yellow: 0xFFD93D,
  black: 0x2C2C2C,
  orange: 0xFF7847,
  hazardous: 0xFFA726,
};

export function buildTilePlaceholder(type: WasteType, size: number): Container {
  const meta = WASTE_META[type];
  const c = new Container();
  const bg = new Graphics();
  bg.roundRect(0, 0, size, size, size * 0.18).fill(BIN_COLORS[meta.bin]);
  bg.roundRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84, size * 0.14).stroke({ color: 0xffffff, width: 3, alpha: 0.5 });
  c.addChild(bg);

  const label = new Text({
    text: shortLabel(type),
    style: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: Math.max(14, size * 0.28),
      fontWeight: '700',
      fill: meta.bin === 'yellow' ? 0x1F2A20 : 0xFFFFFF,
      align: 'center',
    },
  });
  label.anchor.set(0.5);
  label.x = size / 2;
  label.y = size / 2;
  c.addChild(label);
  return c;
}

function shortLabel(type: WasteType): string {
  switch (type) {
    case 'plastic_bottle': return 'BTL';
    case 'can': return 'CAN';
    case 'cardboard': return 'CRT';
    case 'milk_carton': return 'LAIT';
    case 'dirty_yogurt_pot': return 'YGT';
    case 'tissue': return 'MCH';
    case 'broken_toy': return 'JOU';
    case 'apple': return 'POM';
    case 'coffee_grounds': return 'CAF';
    case 'egg_shell': return 'OEUF';
    case 'battery': return 'PILE';
    case 'lightbulb': return 'AMP';
    case 'medication': return 'MED';
  }
}

export function buildBinPlaceholder(bin: Exclude<BinKind, 'hazardous'>, size: number, openness: number): Container {
  const c = new Container();
  const body = new Graphics();
  body.roundRect(0, size * 0.25, size, size * 0.7, size * 0.12).fill(BIN_COLORS[bin]);
  c.addChild(body);

  const lid = new Graphics();
  lid.roundRect(-size * 0.05, 0, size * 1.1, size * 0.18, size * 0.08).fill(0x000000, 0.85);
  lid.pivot.set(size * 0.5, size * 0.18);
  lid.x = size * 0.5;
  lid.y = size * 0.18;
  lid.rotation = -openness * Math.PI * 0.35;
  c.addChild(lid);
  return c;
}

export function generateTexture(renderer: Renderer, container: Container, w: number, h: number) {
  const tex = RenderTexture.create({ width: w, height: h, resolution: window.devicePixelRatio });
  renderer.render({ container, target: tex });
  return tex;
}
