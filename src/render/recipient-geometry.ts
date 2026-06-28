export type RecipientKind = 'lid' | 'flaps';

export interface CapConfig {
  /** 'lid' = couvercle qui pivote (jaune) ; 'flaps' = nœud qui s'écarte en 2 pans (sacs). */
  kind: RecipientKind;
  /** Fraction de la hauteur du récipient occupée par la coiffe animée (depuis le haut). */
  capFrac: number;
  /** Angle d'ouverture (deg). Pivot couvercle pour 'lid', écartement par pan pour 'flaps'. */
  openAngleDeg: number;
}

// Valeurs posées « à l'œil » sur les PNG fermés, à affiner visuellement.
export const CAP_CONFIG: Record<'yellow' | 'black' | 'orange', CapConfig> = {
  yellow: { kind: 'lid', capFrac: 0.14, openAngleDeg: 105 },
  black: { kind: 'flaps', capFrac: 0.22, openAngleDeg: 28 },
  orange: { kind: 'flaps', capFrac: 0.2, openAngleDeg: 32 },
};

export interface CapGeometry {
  capHeightPx: number;
  lid?: { originPct: string; openTransform: string };
  flaps?: {
    left: { originPct: string; openTransform: string };
    right: { originPct: string; openTransform: string };
  };
  mouth: { heightPx: number; bottomPx: number };
}

export function computeCapGeometry(binW: number, binH: number, cfg: CapConfig): CapGeometry {
  const capHeightPx = binH * cfg.capFrac;
  // La bouche sombre occupe ~60 % de la coiffe, sous celle-ci.
  const mouth = { heightPx: capHeightPx * 0.6, bottomPx: 0 };

  if (cfg.kind === 'lid') {
    return {
      capHeightPx,
      lid: {
        originPct: '50% 100%',
        openTransform: `perspective(600px) rotateX(${cfg.openAngleDeg}deg)`,
      },
      mouth,
    };
  }
  const a = cfg.openAngleDeg;
  return {
    capHeightPx,
    flaps: {
      left: { originPct: '100% 100%', openTransform: `rotate(-${a}deg)` },
      right: { originPct: '0% 100%', openTransform: `rotate(${a}deg)` },
    },
    mouth,
  };
}
