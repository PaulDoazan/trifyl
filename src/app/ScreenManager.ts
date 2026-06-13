import { gsap } from 'gsap';
import { ANIM } from './animation-config';

export type ScreenKey = 'veille' | 'home' | 'game' | 'endmedia';

interface ScreenEntry { key: ScreenKey; root: HTMLElement; }

export class ScreenManager {
  private current: ScreenEntry | null = null;
  private screens = new Map<ScreenKey, HTMLElement>();

  constructor(private readonly host: HTMLElement) {}

  register(key: ScreenKey, root: HTMLElement): void {
    this.screens.set(key, root);
    this.host.appendChild(root);
  }

  show(key: ScreenKey): void {
    const root = this.screens.get(key);
    if (!root) throw new Error(`screen not registered: ${key}`);
    if (this.current?.key === key) return;
    if (this.current) {
      const prev = this.current;
      gsap.to(prev.root, {
        opacity: 0,
        duration: ANIM.screenCrossfade.duration,
        onComplete: () => { prev.root.classList.remove('screen--active'); },
      });
    }
    root.classList.add('screen--active');
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: ANIM.screenCrossfade.duration });
    this.current = { key, root };
  }

  currentKey(): ScreenKey | null { return this.current?.key ?? null; }
}
