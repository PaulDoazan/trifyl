export class IdleTracker {
  private timerId: number | null = null;
  private callbacks = new Set<() => void>();
  private pointerHandler = (): void => this.reset();

  constructor(private readonly delayMs: number) {}

  start(): void {
    window.addEventListener('pointerdown', this.pointerHandler, { capture: true });
    this.reset();
  }

  stop(): void {
    window.removeEventListener('pointerdown', this.pointerHandler, { capture: true });
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  reset(): void {
    if (this.timerId !== null) window.clearTimeout(this.timerId);
    this.timerId = window.setTimeout(() => {
      this.timerId = null;
      for (const cb of this.callbacks) cb();
    }, this.delayMs);
  }

  onIdle(cb: () => void): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }
}
