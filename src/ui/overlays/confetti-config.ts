export interface ImageShapeOption {
  src: string;
  width: number;
  height: number;
}

export interface ShapeOptions {
  image: ImageShapeOption[];
}

export interface BurstParams {
  origin: { x: number; y: number };
  spread: number;
  ticks: number;
  gravity: number;
  decay: number;
  startVelocity: number;
  particleCount: number;
  scalar: number;
  shapes: string[];
  shapeOptions: ShapeOptions;
}

const PAILLETTE_SIZE = 32;
const PARTICLE_COUNT = 30;

/** Construit les options d'images (paillettes) pour tsparticles-confetti. */
export function buildShapeOptions(urls: string[]): ShapeOptions {
  return {
    image: urls.map((src) => ({ src, width: PAILLETTE_SIZE, height: PAILLETTE_SIZE })),
  };
}

/** Parametres d'une salve, mis a l'echelle comme la source (innerWidth/1920). */
export function buildBurstParams(
  innerWidth: number,
  originX: number,
  shapeOptions: ShapeOptions,
): BurstParams {
  const k = innerWidth / 1920;
  return {
    origin: { x: originX, y: 0.2 },
    spread: 270 * k,
    ticks: 200,
    gravity: 1 * k,
    decay: 0.93 + 0.01 * k,
    startVelocity: 20 * k,
    particleCount: PARTICLE_COUNT,
    scalar: 4 * k,
    shapes: ['image'],
    shapeOptions,
  };
}
