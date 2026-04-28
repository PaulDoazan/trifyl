import { gsap } from 'gsap';
import type { TileSprite } from './TileSprite';
import { ANIM } from '@/app/animation-config';

export function trapVortex(tile: TileSprite): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: () => tile.destroy() });
  tl.to(tile, {
    rotation: Math.PI * 4,
    duration: ANIM.trapVortex.duration,
    ease: 'power2.in',
  }, 0);
  tl.to(tile, {
    width: 0,
    height: 0,
    alpha: 0,
    duration: ANIM.trapVortex.duration,
    ease: 'power2.in',
  }, 0);
  return tl;
}
