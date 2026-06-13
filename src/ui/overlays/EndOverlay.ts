import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';

export class EndOverlay {
  readonly root: HTMLElement;

  constructor(combinaisonUrl: string, onQuit: () => void) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--end';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="overlay-end__img"></div>
      <button class="overlay-end__close" aria-label="Fermer">×</button>
      <button class="overlay-end__quit" data-quit>Quitter</button>
    `;
    (el.querySelector('.overlay-end__img') as HTMLElement).style.backgroundImage = `url("${combinaisonUrl}")`;
    (el.querySelector('.overlay-end__close') as HTMLButtonElement).onclick = () => this.hide();
    (el.querySelector('[data-quit]') as HTMLButtonElement).onclick = onQuit;
    this.root = el;
  }

  show(): void {
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
  }
  hide(): void {
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
