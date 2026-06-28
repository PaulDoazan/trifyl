export interface VeilleCallbacks { onStart: () => void; }

export class VeilleScreen {
  readonly root: HTMLElement;

  constructor(bgUrl: string, touchezUrl: string, callbacks: VeilleCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen veille';
    el.style.backgroundImage = `url("${bgUrl}")`;
    el.innerHTML = `<button class="veille__touch" aria-label="Toucher pour commencer"></button>`;
    const btn = el.querySelector('.veille__touch') as HTMLButtonElement;
    btn.style.backgroundImage = `url("${touchezUrl}")`;
    el.onclick = () => callbacks.onStart();
    this.root = el;
  }
}
