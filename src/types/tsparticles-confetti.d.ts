declare module 'tsparticles-confetti' {
  export const confetti: {
    create(
      canvas: HTMLCanvasElement,
      options: { resize: boolean },
    ): Promise<(options: Record<string, unknown>) => Promise<unknown>>;
  };
}
