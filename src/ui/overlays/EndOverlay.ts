import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';

export class EndOverlay {
  readonly root: HTMLElement;
  private scoreEl: HTMLElement;
  private btn: HTMLButtonElement;

  constructor(onSeeResult: () => void) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--end';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <h2>Plus de combinaisons possibles</h2>
      <span class="score" data-score>0</span>
      <button data-see>Voir le résultat</button>
    `;
    this.root = el;
    this.scoreEl = el.querySelector('[data-score]') as HTMLElement;
    this.btn = el.querySelector('[data-see]') as HTMLButtonElement;
    this.btn.onclick = onSeeResult;
  }

  show(score: number): void {
    this.scoreEl.textContent = String(score);
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
  }

  hide(): void {
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
