import { SIDEBAR_HOME_BOX } from '@/ui/HUD';

export interface EndMediaCallbacks {
  onHome: () => void;
}

export class EndMediaScreen {
  readonly root: HTMLElement;
  private readonly video: HTMLVideoElement | null = null;
  private readonly loader: HTMLElement | null = null;

  constructor(videoUrl: string | null, homeIconUrl: string, callbacks: EndMediaCallbacks) {
    const el = document.createElement('section');
    el.className = 'screen endmedia';

    const media = document.createElement('div');
    media.className = 'endmedia__media';
    if (videoUrl) {
      const video = document.createElement('video');
      video.className = 'endmedia__video';
      video.src = videoUrl;
      video.preload = 'auto';
      video.playsInline = true;
      video.controls = false;

      // Loader affiché tant que la vidéo n'est pas prête (surtout au 1er chargement).
      const loader = document.createElement('div');
      loader.className = 'endmedia__loader';
      loader.setAttribute('aria-label', 'Chargement de la vidéo…');

      const showLoader = () => loader.classList.remove('endmedia__loader--hidden');
      const hideLoader = () => loader.classList.add('endmedia__loader--hidden');
      video.addEventListener('canplay', hideLoader);
      video.addEventListener('playing', hideLoader);
      video.addEventListener('waiting', showLoader); // rebuffering en cours de lecture
      video.addEventListener('error', hideLoader);

      media.append(video, loader);
      this.video = video;
      this.loader = loader;
    } else {
      // Aucune vidéo déposée (dev, ou fichier client absent) → texte de repli.
      media.textContent = 'Vidéo de sensibilisation';
    }

    // Bouton Accueil : même image et même position qu'il occupe dans la sidebar de jeu.
    const homeBtn = document.createElement('button');
    homeBtn.className = 'menu__btn--icon';
    homeBtn.style.backgroundImage = `url("${homeIconUrl}")`;
    homeBtn.style.left = `${SIDEBAR_HOME_BOX.left}px`;
    homeBtn.style.top = `${SIDEBAR_HOME_BOX.top}px`;
    homeBtn.style.width = `${SIDEBAR_HOME_BOX.width}px`;
    homeBtn.style.height = `${SIDEBAR_HOME_BOX.height}px`;
    homeBtn.onclick = callbacks.onHome;

    el.append(media, homeBtn);
    this.root = el;
  }

  /** Démarre la vidéo depuis le début (appelé quand l'écran devient visible). */
  play(): void {
    if (!this.video) return;
    this.video.currentTime = 0;
    // Pas encore assez bufferisée pour lire ? on montre le loader en attendant.
    if (this.loader && this.video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      this.loader.classList.remove('endmedia__loader--hidden');
    }
    // Appelé dans la foulée d'un tap → autoplay avec son autorisé ; on ignore un rejet éventuel.
    void this.video.play().catch(() => {});
  }

  /** Met la vidéo en pause (appelé quand on quitte l'écran). */
  stop(): void {
    if (!this.video) return;
    this.video.pause();
  }
}
