import { gsap } from 'gsap';
import { ANIM } from '@/app/animation-config';
import type { AssetProvider } from '@/assets/AssetProvider';
import type { Confetti } from './Confetti';

export interface LevelCompleteCallbacks {
  onContinue: () => void;
  onQuit: () => void;
}

export class LevelCompleteOverlay {
  readonly root: HTMLElement;
  private readonly continueBtn: HTMLButtonElement;

  constructor(
    assets: AssetProvider,
    private readonly confetti: Confetti,
    callbacks: LevelCompleteCallbacks,
  ) {
    const el = document.createElement('div');
    el.className = 'overlay overlay--levelcomplete';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div class="levelcomplete__card">
        <div class="levelcomplete__bravo"></div>
        <div class="levelcomplete__buttons">
          <button data-continue class="levelcomplete__imgbtn levelcomplete__imgbtn--continue" aria-label="Continuer"></button>
          <button data-quit class="levelcomplete__imgbtn levelcomplete__imgbtn--quit" aria-label="Quitter la partie"></button>
        </div>
      </div>
    `;
    (el.querySelector('.levelcomplete__bravo') as HTMLElement).style.backgroundImage =
      `url("${assets.getBravoUrl()}")`;
    this.continueBtn = el.querySelector('[data-continue]') as HTMLButtonElement;
    const quitBtn = el.querySelector('[data-quit]') as HTMLButtonElement;
    this.continueBtn.style.backgroundImage = `url("${assets.getBravoButtonUrl('continuer')}")`;
    quitBtn.style.backgroundImage = `url("${assets.getBravoButtonUrl('quitter')}")`;
    this.continueBtn.onclick = callbacks.onContinue;
    quitBtn.onclick = callbacks.onQuit;
    this.root = el;
  }

  show(options: { showContinue: boolean }): void {
    this.continueBtn.style.display = options.showContinue ? '' : 'none';
    this.root.style.pointerEvents = 'auto';
    gsap.to(this.root, { opacity: 1, ...ANIM.overlayIn });
    this.confetti.celebrate();
  }

  hide(): void {
    this.root.style.pointerEvents = 'none';
    gsap.to(this.root, { opacity: 0, ...ANIM.overlayOut });
  }
}
