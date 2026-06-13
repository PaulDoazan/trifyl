export class BinGauge {
  readonly root: HTMLElement;
  private fill: HTMLElement;
  private fillImg: HTMLElement;

  constructor(videUrl: string, pleineUrl: string) {
    const el = document.createElement('div');
    el.className = 'bin-gauge';

    const vide = document.createElement('div');
    vide.className = 'bin-gauge__vide';
    vide.style.backgroundImage = `url("${videUrl}")`;

    this.fill = document.createElement('div');
    this.fill.className = 'bin-gauge__fill';
    this.fill.style.height = '0%';

    this.fillImg = document.createElement('div');
    this.fillImg.className = 'bin-gauge__pleine';
    this.fillImg.style.backgroundImage = `url("${pleineUrl}")`;
    this.fill.appendChild(this.fillImg);

    el.appendChild(this.fill);
    el.appendChild(vide);
    this.root = el;
  }

  /** ratio ∈ [0,1] */
  setFill(ratio: number): void {
    const pct = Math.max(0, Math.min(1, ratio)) * 100;
    this.fill.style.height = `${pct}%`;
  }
}
