import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';
import { GAME_CONFIG } from '@/game/config-loader';

export class EduOverlay {
  readonly root: HTMLElement;
  private img: HTMLElement;
  private timeoutId: number | null = null;

  constructor() {
    const el = document.createElement('div');
    el.className = 'overlay overlay--edu';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="overlay-edu__img"></div>
      <button class="overlay-edu__close" aria-label="Fermer">×</button>
    `;
    this.img = el.querySelector('.overlay-edu__img') as HTMLElement;
    (el.querySelector('.overlay-edu__close') as HTMLButtonElement).onclick = () => this.hide();
    this.root = el;
  }

  /** popupUrl = image (piles/textile/verre). */
  show(popupUrl: string): void {
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.img.style.backgroundImage = `url("${popupUrl}")`;
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
    this.timeoutId = window.setTimeout(() => this.hide(), GAME_CONFIG.timings.eduOverlayMs);
  }

  hide(): void {
    if (this.timeoutId !== null) { window.clearTimeout(this.timeoutId); this.timeoutId = null; }
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
