export interface ScoreInput {
  size: number;
  hasTrap: boolean;
  cascadeIndex: number;
}

export function computeMatchScore({ size, hasTrap, cascadeIndex }: ScoreInput): number {
  let base: number;
  if (size <= 3) base = 30;
  else if (size === 4) base = 60;
  else if (size === 5) base = 100;
  else base = 150;

  const trapMul = hasTrap ? 2 : 1;
  const cascadeMul = Math.min(Math.max(cascadeIndex, 1), 5);
  return base * trapMul * cascadeMul;
}
