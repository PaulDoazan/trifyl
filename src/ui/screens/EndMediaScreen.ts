import { SIDEBAR_HOME_BOX } from '@/ui/HUD';
import {
  isNearEnd,
  computeWatchdogDelayMs,
  NO_VIDEO_FALLBACK_MS,
} from './endmedia-timing';

export interface EndMediaCallbacks {
  onHome: () => void;
}

export class EndMediaScreen {
  readonly root: HTMLElement;
  private readonly video: HTMLVideoElement | null = null;
  private readonly loader: HTMLElement | null = null;
  /** Filet de sécurité armé : fin de vidéo manquée, ou repli sans vidéo. Un seul à la fois. */
  private timerId: number | null = null;
  /** Empêche `onHome` d'être appelé deux fois (ended + garde de fin + filet peuvent se recouvrir). */
  private finished = false;

  constructor(videoUrl: string | null, homeIconUrl: string, private readonly callbacks: EndMediaCallbacks) {
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

      // Retour à l'accueil à la fin de la vidéo — sinon la borne reste figée sur la dernière frame.
      video.addEventListener('ended', () => this.finish());

      // Garde : certains encodages ne déclenchent pas `ended`. La position de lecture, elle, ne ment pas.
      video.addEventListener('timeupdate', () => {
        if (isNearEnd(video.currentTime, video.duration)) this.finish();
        else if (this.timerId === null) this.armWatchdog(); // métadonnées arrivées tardivement
      });

      // Le filet est calé sur le temps restant : on l'arme à la lecture, on le désarme pendant
      // un rebuffering (fréquent sur le stockage BrightSign) pour ne jamais couper la vidéo.
      video.addEventListener('playing', () => { hideLoader(); this.armWatchdog(); });
      video.addEventListener('waiting', () => { showLoader(); this.clearTimer(); });

      // Vidéo illisible : même impasse qu'une vidéo absente → on temporise puis on sort.
      video.addEventListener('error', () => { hideLoader(); this.armTimer(NO_VIDEO_FALLBACK_MS); });

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
    this.finished = false;
    this.clearTimer();
    if (!this.video) {
      // Repli sans vidéo : on ne laisse pas le texte à l'écran indéfiniment.
      this.armTimer(NO_VIDEO_FALLBACK_MS);
      return;
    }
    this.video.currentTime = 0;
    // Pas encore assez bufferisée pour lire ? on montre le loader en attendant.
    if (this.loader && this.video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      this.loader.classList.remove('endmedia__loader--hidden');
    }
    // Appelé dans la foulée d'un tap → autoplay avec son autorisé.
    // Un rejet (autoplay bloqué) laisserait l'écran mort : on temporise pour sortir quand même.
    void this.video.play().catch(() => this.armTimer(NO_VIDEO_FALLBACK_MS));
  }

  /** Met la vidéo en pause et désarme toute temporisation (appelé quand on quitte l'écran). */
  stop(): void {
    this.clearTimer();
    if (!this.video) return;
    this.video.pause();
  }

  /** Retour à l'accueil, une seule fois. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.clearTimer();
    this.callbacks.onHome();
  }

  /** Arme le filet sur le temps de vidéo restant (rien si la durée est encore inconnue). */
  private armWatchdog(): void {
    if (!this.video) return;
    const delay = computeWatchdogDelayMs(this.video.currentTime, this.video.duration);
    if (delay !== null) this.armTimer(delay);
  }

  private armTimer(delayMs: number): void {
    if (this.finished) return; // retour déjà parti : ne pas laisser traîner un timer sur l'accueil
    this.clearTimer();
    this.timerId = window.setTimeout(() => { this.timerId = null; this.finish(); }, delayMs);
  }

  private clearTimer(): void {
    if (this.timerId !== null) { window.clearTimeout(this.timerId); this.timerId = null; }
  }
}
