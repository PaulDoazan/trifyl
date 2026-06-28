import { gsap } from 'gsap';

/**
 * Bandeau de message éphémère (ex. « On redistribue la grille ! »).
 * Stylé en ligne pour ne dépendre d'aucun asset ni feuille de style.
 */
export class Toast {
  readonly root: HTMLElement;
  private timeoutId: number | null = null;

  constructor() {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:12%',
      'transform:translateX(-50%)',
      'padding:18px 36px',
      'border-radius:18px',
      'background:rgba(28,34,42,0.92)',
      'color:#fff',
      'font-size:34px',
      'font-weight:700',
      'letter-spacing:0.5px',
      'box-shadow:0 8px 28px rgba(0,0,0,0.35)',
      'pointer-events:none',
      'white-space:nowrap',
      'opacity:0',
    ].join(';');
    this.root = el;
  }

  show(message: string, durationMs = 1500): void {
    if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
    this.root.textContent = message;
    gsap.killTweensOf(this.root);
    gsap.fromTo(this.root, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
    this.timeoutId = window.setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    if (this.timeoutId !== null) { window.clearTimeout(this.timeoutId); this.timeoutId = null; }
    gsap.to(this.root, { opacity: 0, duration: 0.2, ease: 'power2.in' });
  }
}
