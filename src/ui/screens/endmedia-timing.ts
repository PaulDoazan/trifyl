/**
 * Temporisations de l'écran de fin (logique pure, testable sans DOM).
 *
 * Sur le kiosque, l'événement `ended` de <video> est le signal normal de fin, mais il n'est pas
 * fiable à 100 % sous Chromium (dernière frame tronquée, conteneur mal muxé). Sans filet, la borne
 * reste figée sur l'image finale jusqu'au timeout d'inactivité (5 min) — elle paraît plantée.
 * Ces helpers dimensionnent le filet de sécurité.
 */

/** Marge ajoutée au temps restant avant que le filet ne ramène à l'accueil de lui-même. */
export const WATCHDOG_MARGIN_MS = 4_000;

/** Tolérance (secondes) sous la durée totale à partir de laquelle la vidéo est considérée finie. */
export const NEAR_END_EPSILON_S = 0.25;

/** Durée d'affichage du repli quand aucune vidéo n'est déposée (ou qu'elle est illisible). */
export const NO_VIDEO_FALLBACK_MS = 15_000;

/** Une durée n'est exploitable que si elle est finie et strictement positive (0/NaN = métadonnées absentes, Infinity = flux live). */
function isUsableDuration(duration: number): boolean {
  return Number.isFinite(duration) && duration > 0;
}

/** La lecture a-t-elle atteint la fin ? Sert de garde quand `ended` ne part pas. */
export function isNearEnd(currentTime: number, duration: number, epsilon = NEAR_END_EPSILON_S): boolean {
  if (!isUsableDuration(duration)) return false;
  return currentTime >= duration - epsilon;
}

/**
 * Délai du filet de sécurité depuis maintenant : temps restant + marge.
 * `null` si la durée est inexploitable → pas de filet armé (on s'en remet à `ended`).
 */
export function computeWatchdogDelayMs(
  currentTime: number,
  duration: number,
  marginMs = WATCHDOG_MARGIN_MS,
): number | null {
  if (!isUsableDuration(duration)) return null;
  const remainingMs = Math.max(0, (duration - currentTime) * 1000);
  return remainingMs + marginMs;
}
