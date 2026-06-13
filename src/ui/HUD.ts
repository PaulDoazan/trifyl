import { MENU_WIDTH } from '@/app/config';
import type { AssetProvider } from '@/assets/AssetProvider';
import { BIN_CATEGORIES, GAME_CONFIG, type BinCategory } from '@/game/config-loader';
import { BinGauge } from './BinGauge';

export interface HUDCallbacks {
  onHome: () => void;
  onQuit: () => void;
  onSelectLevel: (level: 1 | 2 | 3) => void;
}

// Position (coords scène, le menu démarre à gauche=0) des 3 étoiles peintes dans l'image.
const STAR_HITBOXES: ReadonlyArray<{ level: 1 | 2 | 3; left: number }> = [
  { level: 1, left: 126 },
  { level: 2, left: 198 },
  { level: 3, left: 270 },
];

export class HUD {
  readonly root: HTMLElement;
  private gauges: Record<BinCategory, BinGauge>;

  constructor(level: 1 | 2 | 3, assets: AssetProvider, homeUrl: string, quitterUrl: string, callbacks: HUDCallbacks) {
    const m = document.createElement('aside');
    m.className = 'menu';
    m.style.width = `${MENU_WIDTH}px`;

    // Le libellé « Niveau X » et les étoiles sont déjà dessinés dans l'image de fond (grille_nivX.png).

    const binsWrap = document.createElement('div');
    binsWrap.className = 'menu__bins';
    this.gauges = {} as Record<BinCategory, BinGauge>;
    for (const bin of BIN_CATEGORIES) {
      const g = new BinGauge(assets.getBinVideUrl(level, bin), assets.getBinPleineUrl(bin));
      this.gauges[bin] = g;
      binsWrap.appendChild(g.root);
    }

    const footer = document.createElement('div');
    footer.className = 'menu__footer';
    const homeBtn = document.createElement('button');
    homeBtn.className = 'menu__btn menu__btn--icon';
    homeBtn.style.backgroundImage = `url("${homeUrl}")`;
    homeBtn.onclick = callbacks.onHome;
    const quitBtn = document.createElement('button');
    quitBtn.className = 'menu__btn menu__btn--icon';
    quitBtn.style.backgroundImage = `url("${quitterUrl}")`;
    quitBtn.onclick = callbacks.onQuit;
    footer.append(homeBtn, quitBtn);

    m.append(binsWrap, footer);

    // Étoiles cliquables (debug) : sauter directement à un niveau pour tester.
    if (GAME_CONFIG.debug.levelStarNav) {
      for (const s of STAR_HITBOXES) {
        const hit = document.createElement('button');
        hit.className = 'menu__star-hit';
        hit.style.cssText = `position:absolute;left:${s.left}px;top:40px;width:64px;height:64px;padding:0;border:none;background:transparent;cursor:pointer;`;
        hit.title = `Aller au niveau ${s.level}`;
        hit.onclick = () => callbacks.onSelectLevel(s.level);
        m.appendChild(hit);
      }
    }

    this.root = m;
  }

  setFill(bin: BinCategory, ratio: number): void {
    this.gauges[bin].setFill(ratio);
  }

  destroy(): void { this.root.remove(); }
}
