import { gsap } from 'gsap';
import { MENU_WIDTH } from '@/app/config';
import { ANIM } from '@/app/animation-config';
import type { BinKind } from '@/game/waste';

const BIN_LABELS: Record<Exclude<BinKind, 'hazardous'>, string> = {
  yellow: 'Bac jaune — Recyclables',
  black: 'Sac noir — Résiduels',
  orange: 'Sac orange — Biodéchets',
};

export interface HUDCallbacks {
  onHome: () => void;
  onQuit: () => void;
}

export class HUD {
  readonly root: HTMLElement;
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private displayedScore = 0;

  constructor(level: 1 | 2 | 3, callbacks: HUDCallbacks) {
    const m = document.createElement('aside');
    m.className = 'menu';
    m.style.width = `${MENU_WIDTH}px`;

    m.innerHTML = `
      <div class="menu__infos">
        <span class="menu__score-label">Score</span>
        <span class="menu__score" data-score>0</span>
      </div>
      <div class="menu__level" data-level>Niveau ${String(level).padStart(2, '0')}</div>
      <div class="menu__bins">
        <div class="menu__bin-label">${BIN_LABELS.yellow}</div>
        <div class="menu__bin-label">${BIN_LABELS.black}</div>
        <div class="menu__bin-label">${BIN_LABELS.orange}</div>
      </div>
      <div class="menu__footer">
        <button class="menu__btn" data-home>Accueil</button>
        <button class="menu__btn" data-quit>Quitter le jeu</button>
      </div>
    `;
    this.root = m;
    this.scoreEl = m.querySelector('[data-score]') as HTMLElement;
    this.levelEl = m.querySelector('[data-level]') as HTMLElement;

    (m.querySelector('[data-home]') as HTMLButtonElement).onclick = callbacks.onHome;
    (m.querySelector('[data-quit]') as HTMLButtonElement).onclick = callbacks.onQuit;
  }

  setScore(value: number): void {
    const obj = { v: this.displayedScore };
    gsap.to(obj, {
      v: value,
      duration: ANIM.scoreCountUp.duration,
      ease: ANIM.scoreCountUp.ease,
      onUpdate: () => { this.scoreEl.textContent = String(Math.round(obj.v)); },
      onComplete: () => { this.displayedScore = value; this.scoreEl.textContent = String(value); },
    });
  }

  destroy(): void {
    this.root.remove();
  }
}
