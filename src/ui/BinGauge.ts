import type { BinCategory } from '@/game/config-loader';

/**
 * Géométrie mesurée des assets de poubelles (px), par couleur.
 * - cw×ch  : dimensions du BAC dessiné (l'image « vide » fait exactement cette taille ;
 *            dans l'image « pleine » c'est le contenu non transparent).
 * - pcw    : largeur du canvas de l'image « pleine » (elle a des marges transparentes).
 * - pox    : décalage X du bac dans le canvas « pleine ».
 * Sert à superposer pixel-près « vide » et « pleine » malgré leurs canvas différents.
 */
const GEO: Record<BinCategory, { cw: number; ch: number; pcw: number; pox: number }> = {
  yellow: { cw: 165, ch: 270, pcw: 226, pox: 25 },
  black: { cw: 171, ch: 207, pcw: 197, pox: 15 },
  orange: { cw: 166, ch: 168, pcw: 225, pox: 20 },
};

/**
 * Fraction de hauteur (depuis le bas du bac) de chaque pointillé, par niveau puis couleur.
 * Mesuré sur les assets niv{1,2,3}_poub_*_vide.png. Trié croissant (bas → haut).
 * Chaque pointillé = un palier de remplissage.
 */
const DASH_FRAC: Record<1 | 2 | 3, Record<BinCategory, number[]>> = {
  1: {
    yellow: [0.267, 0.42, 0.576, 0.731],
    black: [0.21, 0.345, 0.481, 0.616],
    orange: [0.223, 0.348, 0.476, 0.604],
  },
  2: {
    yellow: [0.189, 0.267, 0.343, 0.42, 0.498, 0.576, 0.654, 0.731, 0.807],
    black: [0.143, 0.21, 0.278, 0.345, 0.413, 0.481, 0.548, 0.616, 0.684],
    orange: [0.163, 0.225, 0.287, 0.352, 0.411, 0.476, 0.538, 0.601, 0.666],
  },
  3: {
    yellow: [0.163, 0.215, 0.265, 0.317, 0.369, 0.42, 0.472, 0.524, 0.576, 0.628, 0.68, 0.73, 0.781, 0.833],
    black: [0.121, 0.167, 0.21, 0.256, 0.302, 0.345, 0.391, 0.437, 0.481, 0.527, 0.572, 0.616, 0.662, 0.708],
    orange: [0.134, 0.176, 0.22, 0.262, 0.307, 0.348, 0.39, 0.432, 0.473, 0.515, 0.557, 0.601, 0.643],
  },
};

export interface BinGaugeBox {
  width: number;
  height: number;
}

export class BinGauge {
  readonly root: HTMLElement;
  /** Nombre d'étages remplissables (= nombre de pointillés + 1). */
  readonly maxEtages: number;
  private fill: HTMLElement;
  private fillImg: HTMLElement;
  private stops: number[];
  /** rapport hauteur réellement rendue du bac / hauteur de la boîte (≤ 1). */
  private heightK: number;

  constructor(bin: BinCategory, level: 1 | 2 | 3, videUrl: string, pleineUrl: string, box: BinGaugeBox) {
    const geo = GEO[bin];
    // Échelle commune (« contain » sur le BAC, pas sur le canvas) → vide & pleine alignés.
    const s = Math.min(box.width / geo.cw, box.height / geo.ch);
    const binW = geo.cw * s;
    const binH = geo.ch * s;
    this.heightK = binH / box.height;
    // 0 = vide ; chaque pointillé = un palier ; 1 = plein.
    this.stops = [0, ...DASH_FRAC[level][bin], 1];
    this.maxEtages = this.stops.length - 1;

    const el = document.createElement('div');
    el.className = 'bin-gauge';

    const vide = document.createElement('div');
    vide.className = 'bin-gauge__vide';
    vide.style.backgroundImage = `url("${videUrl}")`;
    vide.style.backgroundSize = `${binW}px ${binH}px`;
    vide.style.backgroundPosition = 'center bottom';

    this.fill = document.createElement('div');
    this.fill.className = 'bin-gauge__fill';
    this.fill.style.height = '0%';

    this.fillImg = document.createElement('div');
    this.fillImg.className = 'bin-gauge__pleine';
    this.fillImg.style.backgroundImage = `url("${pleineUrl}")`;
    // Le bac dans « pleine » est décalé de pox dans un canvas plus large : on l'aligne sur « vide ».
    const pleineLeft = (box.width - binW) / 2 - geo.pox * s;
    this.fillImg.style.backgroundSize = `${geo.pcw * s}px ${binH}px`;
    this.fillImg.style.backgroundPosition = `${pleineLeft}px bottom`;
    this.fill.appendChild(this.fillImg);

    // L'intérieur de « vide » est BLANC OPAQUE : la couleur passe PAR-DESSUS, clippée par le bas.
    el.appendChild(vide);
    el.appendChild(this.fill);
    this.root = el;
  }

  /** n = nombre d'étages remplis (1 par combo). Calé sur les pointillés. */
  setEtages(n: number): void {
    const step = Math.max(0, Math.min(this.maxEtages, Math.round(n)));
    const frac = this.stops[step] ?? 0;
    // frac est une fraction de la HAUTEUR DU BAC ; on la ramène en % de la boîte.
    this.fill.style.height = `${frac * this.heightK * 100}%`;
  }
}
