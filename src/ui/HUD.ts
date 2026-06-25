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
const STAR_HITBOXES: ReadonlyArray<{ level: 1 | 2 | 3; left: number; top: number }> = [
  { level: 1, left: 166, top: 270 },
  { level: 2, left: 238, top: 270 },
  { level: 3, left: 310, top: 270 },
];

type Box = { left: number; top: number; width: number; height: number };

/**
 * Disposition de la sidebar, en PIXELS ABSOLUS depuis son coin haut-gauche.
 * L'écran de déploiement a toujours la même taille (sidebar 528 × 1080) :
 * ajuste librement ces valeurs, rien d'autre n'est à toucher.
 */
const LAYOUT: { bins: Record<BinCategory, Box>; home: Box; quit: Box } = {
  // Poubelles en triangle : jaune en haut au centre, noire en bas à gauche, orange en bas à droite.
  bins: {
    yellow: { left: 150, top: 300, width: 200, height: 250 },
    black: { left: 60, top: 590, width: 160, height: 210 },
    orange: { left: 270, top: 590, width: 160, height: 210 },
  },
  // Boutons du bas. home agrandi ; quitter à la même hauteur de pastille blanche (90px).
  // Largeurs calées sur le ratio de chaque image (home 95×81, quitter 238×66) pour éviter toute déformation.
  home: { left: 41, top: 950, width: 105, height: 90 },
  quit: { left: 185, top: 965, width: 250, height: 75 },
};

function applyBox(el: HTMLElement, box: Box): void {
  el.style.position = 'absolute';
  el.style.left = `${box.left}px`;
  el.style.top = `${box.top}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
}

export class HUD {
  readonly root: HTMLElement;
  private gauges: Record<BinCategory, BinGauge>;

  constructor(level: 1 | 2 | 3, assets: AssetProvider, homeUrl: string, quitterUrl: string, callbacks: HUDCallbacks) {
    const m = document.createElement('aside');
    m.className = 'menu';
    m.style.width = `${MENU_WIDTH}px`;

    // Le libellé « Niveau X » et les étoiles sont déjà dessinés dans l'image de fond (grille_nivX.png).

    this.gauges = {} as Record<BinCategory, BinGauge>;
    for (const bin of BIN_CATEGORIES) {
      const box = LAYOUT.bins[bin];
      const g = new BinGauge(bin, level, assets.getBinVideUrl(level, bin), assets.getBinPleineUrl(bin), box);
      applyBox(g.root, box);
      g.root.style.setProperty('--gh', `${box.height}px`);
      this.gauges[bin] = g;
      m.appendChild(g.root);
    }

    const homeBtn = document.createElement('button');
    homeBtn.className = 'menu__btn--icon';
    homeBtn.style.backgroundImage = `url("${homeUrl}")`;
    homeBtn.onclick = callbacks.onHome;
    applyBox(homeBtn, LAYOUT.home);
    const quitBtn = document.createElement('button');
    quitBtn.className = 'menu__btn--icon';
    quitBtn.style.backgroundImage = `url("${quitterUrl}")`;
    quitBtn.onclick = callbacks.onQuit;
    applyBox(quitBtn, LAYOUT.quit);

    m.append(homeBtn, quitBtn);

    // Étoiles cliquables (debug) : sauter directement à un niveau pour tester.
    if (GAME_CONFIG.debug.levelStarNav) {
      for (const s of STAR_HITBOXES) {
        const hit = document.createElement('button');
        hit.className = 'menu__star-hit';
        hit.style.cssText = `position:absolute;left:${s.left}px;top:${s.top}px;width:64px;height:64px;padding:0;border:none;background:transparent;cursor:pointer;`;
        hit.title = `Aller au niveau ${s.level}`;
        hit.onclick = () => callbacks.onSelectLevel(s.level);
        m.appendChild(hit);
      }
    }

    this.root = m;
  }

  setEtages(bin: BinCategory, n: number): void {
    this.gauges[bin].setEtages(n);
  }

  binMaxEtages(bin: BinCategory): number {
    return this.gauges[bin].maxEtages;
  }

  destroy(): void { this.root.remove(); }
}
