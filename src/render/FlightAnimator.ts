import { gsap } from 'gsap';
import type { TileSprite } from './TileSprite';
import { ANIM } from '@/app/animation-config';

export interface FlightTarget { x: number; y: number; }

export function flyTileToBin(tile: TileSprite, target: FlightTarget): gsap.core.Timeline {
  const tl = gsap.timeline({
    onComplete: () => tile.destroy(),
  });
  const peakY = Math.min(tile.y, target.y) - 80;
  const midX = (tile.x + target.x) / 2;
  tl.to(tile, { x: midX, y: peakY, duration: ANIM.flightToBin.duration / 2, ease: 'power2.out' }, 0);
  tl.to(tile, { x: target.x, y: target.y, duration: ANIM.flightToBin.duration / 2, ease: 'power2.in' });
  tl.to(tile, { width: tile.width * 0.3, height: tile.height * 0.3, alpha: 0.6, duration: ANIM.flightToBin.duration, ease: 'power1.in' }, 0);
  return tl;
}
