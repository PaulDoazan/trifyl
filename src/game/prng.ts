export interface Prng {
  next(): number;                              // [0, 1)
  intRange(min: number, max: number): number;  // inclusive both ends
  pick<T>(arr: readonly T[]): T;
}

export function createPrng(seed: number): Prng {
  let state = seed >>> 0;
  if (state === 0) state = 0x9E3779B9;

  const next = (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    intRange(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error('pick from empty array');
      return arr[Math.floor(next() * arr.length)]!;
    },
  };
}
