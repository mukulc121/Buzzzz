export const COUNTDOWN_OPTIONS = [3, 5, 10];

// The last three seconds tick harder, zero gets the finale.
export const tickKind = (remaining: number) =>
  remaining <= 0 ? "done" : remaining <= 3 ? "strong" : "soft";
