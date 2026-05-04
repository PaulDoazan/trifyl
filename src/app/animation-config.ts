export const ANIM = {
  swapValid: { duration: 0.15, ease: 'power2.out' },
  swapInvalid: { duration: 0.3, ease: 'power2.inOut' },
  flightToBin: { duration: 0.4, ease: 'power2.in' },
  binOpen: { duration: 0.5 },
  trapVortex: { duration: 0.5, ease: 'power2.in' },
  cascadeDropPerCell: 0.25,
  refill: { duration: 0.3, ease: 'power2.out' },
  scoreCountUp: { duration: 0.4, ease: 'power1.out' },
  overlayIn: { duration: 0.25, ease: 'power2.out' },
  overlayOut: { duration: 0.2, ease: 'power2.in' },
  screenCrossfade: { duration: 0.3, ease: 'power1.inOut' },
  screensaverFadeIn: { duration: 0.6, ease: 'power1.out' },
} as const;
