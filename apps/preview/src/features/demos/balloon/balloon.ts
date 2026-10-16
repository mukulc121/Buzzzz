const INFLATE_MS = 2200;
const DEFLATE_MS = 700;

export const inflate = (level: number, dt: number) => Math.min(1, level + dt / INFLATE_MS);
export const deflate = (level: number, dt: number) => Math.max(0, level - dt / DEFLATE_MS);
export const isPopped = (level: number) => level >= 1;
export const balloonScale = (level: number) => 0.55 + 0.6 * level;

// Tension builds faster than size: strength grows with the square of the fill.
export const stretchFeel = (level: number) => ({
  amplitude: Math.round((0.15 + 0.7 * level * level) * 100) / 100,
  frequency: Math.round((0.2 + 0.6 * level) * 100) / 100,
});
