export interface EndMediaCallbacks {
  onReplay: () => void;
  onHome: () => void;
}

export class EndMediaScreen {
  readonly root: HTMLElement;

  constructor(callbacks: EndMediaCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen endmedia';
    el.innerHTML = `
      <div class="endmedia__media">Vidéo de sensibilisation</div>
      <div class="endmedia__buttons">
        <button class="endmedia__btn endmedia__btn--home" data-home>Accueil</button>
        <button class="endmedia__btn" data-replay>Rejouer</button>
      </div>
    `;
    (el.querySelector('[data-replay]') as HTMLButtonElement).onclick = callbacks.onReplay;
    (el.querySelector('[data-home]') as HTMLButtonElement).onclick = callbacks.onHome;
    this.root = el;
  }
}
