export interface WelcomeCallbacks {
  onSelectLevel: (level: 1 | 2 | 3) => void;
}

export class WelcomeScreen {
  readonly root: HTMLElement;

  constructor(callbacks: WelcomeCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen welcome';
    el.innerHTML = `
      <h1 class="welcome__title">Es-tu un serial trieur ?</h1>
      <div class="welcome__levels">
        <button class="welcome__btn welcome__btn--1" data-level="1">Niveau 1<small>Facile</small></button>
        <button class="welcome__btn welcome__btn--2" data-level="2">Niveau 2<small>Intermédiaire</small></button>
        <button class="welcome__btn welcome__btn--3" data-level="3">Niveau 3<small>Expert</small></button>
      </div>
    `;
    el.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((b) => {
      b.onclick = () => callbacks.onSelectLevel(Number(b.dataset.level) as 1 | 2 | 3);
    });
    this.root = el;
  }
}
