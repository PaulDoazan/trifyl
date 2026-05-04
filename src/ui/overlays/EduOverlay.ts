import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';
import { EDU_OVERLAY_MS } from '@/app/config';

export class EduOverlay {
  readonly root: HTMLElement;
  private timeoutId: number | null = null;

  constructor() {
    const el = document.createElement('div');
    el.className = 'overlay overlay--edu';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    this.root = el;
  }

  show(text: string): void {
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.root.textContent = text;
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
    this.timeoutId = window.setTimeout(() => this.hide(), EDU_OVERLAY_MS);
  }

  hide(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
