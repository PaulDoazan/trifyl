export interface ScreensaverCallbacks {
  onWake: () => void;
}

export class ScreensaverScreen {
  readonly root: HTMLElement;

  constructor(callbacks: ScreensaverCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen screensaver';
    el.innerHTML = `<div class="screensaver__hint">Touchez l'écran pour reprendre</div>`;
    el.addEventListener('pointerdown', () => callbacks.onWake());
    this.root = el;
  }
}
