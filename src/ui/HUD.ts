import { MENU_WIDTH } from '@/app/config';
import type { AssetProvider } from '@/assets/AssetProvider';
import { BIN_CATEGORIES, type BinCategory } from '@/game/config-loader';
import { BinGauge } from './BinGauge';

export interface HUDCallbacks {
  onHome: () => void;
  onQuit: () => void;
}

export class HUD {
  readonly root: HTMLElement;
  private gauges: Record<BinCategory, BinGauge>;

  constructor(level: 1 | 2 | 3, assets: AssetProvider, homeUrl: string, quitterUrl: string, callbacks: HUDCallbacks) {
    const m = document.createElement('aside');
    m.className = 'menu';
    m.style.width = `${MENU_WIDTH}px`;

    const lvl = document.createElement('div');
    lvl.className = 'menu__level';
    lvl.textContent = `Niveau ${String(level).padStart(2, '0')}`;

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

    m.append(lvl, binsWrap, footer);
    this.root = m;
  }

  setFill(bin: BinCategory, ratio: number): void {
    this.gauges[bin].setFill(ratio);
  }

  destroy(): void { this.root.remove(); }
}
