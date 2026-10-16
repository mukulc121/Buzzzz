export const DOT_COUNT = 3;
export const DOT_MS = 240;

export const nextDot = (index: number) => (index + 1) % DOT_COUNT;

// Each dot rises in pitch so the loop reads as a little three-note run.
export const dotFeel = (index: number) => ({
  amplitude: Math.round((0.45 + 0.25 * index) * 100) / 100,
  frequency: Math.round((0.3 + 0.25 * index) * 100) / 100,
});
