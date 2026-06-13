export interface HomeCallbacks { onStart: () => void; }

export class HomeScreen {
  readonly root: HTMLElement;

  constructor(bgUrl: string, commencerUrl: string, callbacks: HomeCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen home';
    el.style.backgroundImage = `url("${bgUrl}")`;
    el.innerHTML = `<button class="home__start" aria-label="Commencer"></button>`;
    const btn = el.querySelector('.home__start') as HTMLButtonElement;
    btn.style.backgroundImage = `url("${commencerUrl}")`;
    btn.onclick = (e) => { e.stopPropagation(); callbacks.onStart(); };
    this.root = el;
  }
}
