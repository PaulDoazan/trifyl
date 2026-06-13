import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';

export interface LevelCompleteCallbacks {
  onContinue: () => void;
  onQuit: () => void;
}

export class LevelCompleteOverlay {
  readonly root: HTMLElement;

  constructor(callbacks: LevelCompleteCallbacks) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--levelcomplete';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="levelcomplete__card">
        <h2>Niveau terminé !</h2>
        <div class="levelcomplete__buttons">
          <button data-continue class="levelcomplete__btn levelcomplete__btn--continue">Continuer</button>
          <button data-quit class="levelcomplete__btn levelcomplete__btn--quit">Quitter la partie</button>
        </div>
      </div>
    `;
    (el.querySelector('[data-continue]') as HTMLButtonElement).onclick = callbacks.onContinue;
    (el.querySelector('[data-quit]') as HTMLButtonElement).onclick = callbacks.onQuit;
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
