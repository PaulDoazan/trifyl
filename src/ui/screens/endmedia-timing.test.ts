import { describe, it, expect } from 'vitest';
import {
  isNearEnd,
  computeWatchdogDelayMs,
  WATCHDOG_MARGIN_MS,
  NEAR_END_EPSILON_S,
  NO_VIDEO_FALLBACK_MS,
} from './endmedia-timing';

describe('isNearEnd', () => {
  it('détecte la fin quand la lecture atteint la tolérance', () => {
    expect(isNearEnd(30 - NEAR_END_EPSILON_S, 30)).toBe(true);
    expect(isNearEnd(29.9, 30)).toBe(true);
    expect(isNearEnd(31, 30)).toBe(true);
  });

  it('ne déclenche pas en cours de lecture', () => {
    expect(isNearEnd(0, 30)).toBe(false);
    expect(isNearEnd(29, 30)).toBe(false);
  });

  it('reste faux quand la durée est inexploitable', () => {
    expect(isNearEnd(5, Number.NaN)).toBe(false);
    expect(isNearEnd(5, Number.POSITIVE_INFINITY)).toBe(false);
    expect(isNearEnd(5, 0)).toBe(false);
  });
});

describe('computeWatchdogDelayMs', () => {
  it('couvre le temps restant plus la marge', () => {
    expect(computeWatchdogDelayMs(10, 30)).toBe(20_000 + WATCHDOG_MARGIN_MS);
    expect(computeWatchdogDelayMs(0, 30)).toBe(30_000 + WATCHDOG_MARGIN_MS);
  });

  it('ne renvoie jamais de délai négatif au-delà de la durée', () => {
    expect(computeWatchdogDelayMs(31, 30)).toBe(WATCHDOG_MARGIN_MS);
  });

  it('renvoie null quand la durée est inexploitable (métadonnées absentes, flux live)', () => {
    expect(computeWatchdogDelayMs(0, Number.NaN)).toBeNull();
    expect(computeWatchdogDelayMs(0, Number.POSITIVE_INFINITY)).toBeNull();
    expect(computeWatchdogDelayMs(0, 0)).toBeNull();
  });
});

describe('constantes de temporisation', () => {
  it('laisse une marge suffisante pour ne pas couper une fin de vidéo', () => {
    expect(WATCHDOG_MARGIN_MS).toBeGreaterThanOrEqual(2_000);
  });

  it('sort du repli sans vidéo en un temps compatible kiosque', () => {
    expect(NO_VIDEO_FALLBACK_MS).toBeGreaterThan(0);
    expect(NO_VIDEO_FALLBACK_MS).toBeLessThanOrEqual(30_000);
  });
});
