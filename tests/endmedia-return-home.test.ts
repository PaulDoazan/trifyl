import { describe, it, expect, beforeEach } from 'vitest';

// ---- Horloge virtuelle + DOM minimal (l'env vitest est "node", pas de jsdom) ----
let now = 0;
let timers: { id: number; at: number; fn: () => void }[] = [];
let nextId = 1;

function advance(ms: number): void {
  const target = now + ms;
  for (;;) {
    const due = timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
    if (!due) break;
    timers = timers.filter((t) => t.id !== due.id);
    now = due.at;
    due.fn();
  }
  now = target;
}

type FakeEl = any;
let lastVideo: FakeEl = null;

function makeEl(tag: string): FakeEl {
  const listeners = new Map<string, (() => void)[]>();
  const classes = new Set<string>();
  const el: FakeEl = {
    tagName: tag, className: '', textContent: '', style: {}, onclick: null,
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c), contains: (c: string) => classes.has(c) },
    setAttribute: () => {}, append: () => {},
    addEventListener: (t: string, fn: () => void) => { if (!listeners.has(t)) listeners.set(t, []); listeners.get(t)!.push(fn); },
    dispatch: (t: string) => { for (const fn of listeners.get(t) ?? []) fn(); },
  };
  if (tag === 'video') {
    Object.assign(el, {
      src: '', preload: '', playsInline: false, controls: false,
      currentTime: 0, duration: Number.NaN, readyState: 0,
      paused: true,
      play: () => { el.paused = false; return Promise.resolve(); },
      pause: () => { el.paused = true; },
    });
    lastVideo = el;
  }
  return el;
}

(globalThis as any).document = { createElement: (tag: string) => makeEl(tag) };
(globalThis as any).HTMLMediaElement = { HAVE_FUTURE_DATA: 3 };
(globalThis as any).window = {
  setTimeout: (fn: () => void, ms: number) => { const id = nextId++; timers.push({ id, at: now + ms, fn }); return id; },
  clearTimeout: (id: number) => { timers = timers.filter((t) => t.id !== id); },
};

const { EndMediaScreen } = await import('@/ui/screens/EndMediaScreen');
const { NO_VIDEO_FALLBACK_MS, WATCHDOG_MARGIN_MS } = await import('@/ui/screens/endmedia-timing');

const DURATION = 29.96; // durée réelle de ecran_fin_jeu.mp4

function setup(withVideo = true) {
  let homeCount = 0;
  const screen = new EndMediaScreen(withVideo ? 'blob:video' : null, 'icon.png', { onHome: () => { homeCount++; } });
  const v = withVideo ? lastVideo : null;
  return { screen, v, home: () => homeCount };
}

/** Amorce une lecture normale : métadonnées connues, lecture démarrée. */
function startPlayback(s: ReturnType<typeof setup>) {
  s.screen.play();
  s.v.duration = DURATION;
  s.v.readyState = 4;
  s.v.dispatch('playing');
}

beforeEach(() => { now = 0; timers = []; nextId = 1; lastVideo = null; });

describe('EndMediaScreen — retour à l\'accueil', () => {
  it('revient à l\'accueil quand la vidéo se termine normalement', () => {
    const s = setup();
    startPlayback(s);
    s.v.currentTime = 10; s.v.dispatch('timeupdate');
    expect(s.home()).toBe(0); // toujours en lecture

    s.v.currentTime = DURATION; s.v.dispatch('ended');
    expect(s.home()).toBe(1);

    advance(120_000); // aucun timer résiduel ne doit rejouer un retour
    expect(s.home()).toBe(1);
  });

  it('revient quand `ended` ne part jamais (fin tronquée) via la garde de position', () => {
    const s = setup();
    startPlayback(s);
    s.v.currentTime = DURATION - 0.1; s.v.dispatch('timeupdate');
    expect(s.home()).toBe(1);
  });

  it('revient quand ni `ended` ni la garde ne partent, via le filet temporisé', () => {
    const s = setup();
    startPlayback(s);
    s.v.currentTime = 29.0; s.v.dispatch('timeupdate'); // gèle avant la zone de garde
    expect(s.home()).toBe(0);

    advance(DURATION * 1000 + WATCHDOG_MARGIN_MS - 1);
    expect(s.home()).toBe(0); // pas avant l'heure

    advance(2);
    expect(s.home()).toBe(1);
  });

  it('ne coupe pas la vidéo pendant un rebuffering, même long', () => {
    const s = setup();
    startPlayback(s);
    s.v.currentTime = 10; s.v.dispatch('timeupdate');

    s.v.dispatch('waiting');   // stockage BrightSign lent
    advance(180_000);          // 3 min de rebuffering
    expect(s.home()).toBe(0);  // ne doit PAS être rentré à l'accueil

    s.v.dispatch('playing');   // reprise → filet réarmé sur le restant
    advance((DURATION - 10) * 1000 + WATCHDOG_MARGIN_MS + 1);
    expect(s.home()).toBe(1);
  });

  it('n\'appelle onHome qu\'une fois si plusieurs signaux se recouvrent', () => {
    const s = setup();
    startPlayback(s);
    s.v.currentTime = DURATION; s.v.dispatch('timeupdate'); // garde
    s.v.dispatch('ended');                                  // + ended
    advance(200_000);                                       // + filet
    expect(s.home()).toBe(1);
  });

  it('sort du repli quand aucune vidéo n\'est déposée', () => {
    const s = setup(false);
    s.screen.play();
    advance(NO_VIDEO_FALLBACK_MS - 1);
    expect(s.home()).toBe(0);
    advance(2);
    expect(s.home()).toBe(1);
  });

  it('sort quand la vidéo est illisible (erreur de chargement)', () => {
    const s = setup();
    s.screen.play();
    s.v.dispatch('error');
    advance(NO_VIDEO_FALLBACK_MS + 1);
    expect(s.home()).toBe(1);
  });

  it('stop() désarme tout (sortie par le bouton Accueil)', () => {
    const s = setup();
    startPlayback(s);
    s.screen.stop(); // ce que fait goHome()
    advance(300_000);
    expect(s.home()).toBe(0); // pas de retour fantôme depuis l'accueil
    expect(s.v.paused).toBe(true);
  });

  it('repart proprement à la visite suivante', () => {
    const s = setup();
    startPlayback(s);
    s.v.currentTime = DURATION; s.v.dispatch('ended');
    expect(s.home()).toBe(1);
    s.screen.stop();

    startPlayback(s); // 2e partie
    expect(s.v.currentTime).toBe(0);
    s.v.currentTime = DURATION; s.v.dispatch('ended');
    expect(s.home()).toBe(2);
  });
});
