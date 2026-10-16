import type { Pattern } from "@buzzzz/core";
import { tapsPattern } from "../shared/patterns";

type Hit = "kick" | "hat";
interface IBeat {
  time: number;
  hit: Hit;
}

export const TRACK_MS = 4000;
const kick = (time: number): IBeat => ({ time, hit: "kick" });
const hat = (time: number): IBeat => ({ time, hit: "hat" });
// 120 BPM: kicks on the beat, hats on the off-beat, a double kick at the end of each bar.
export const BEATS: IBeat[] = [0, 1000, 2000, 3000].flatMap((bar) => [
  kick(bar),
  hat(bar + 250),
  kick(bar + 500),
  hat(bar + 750),
  kick(bar + 875),
]);

const FEEL: Record<Hit, { amplitude: number; frequency: number }> = {
  kick: { amplitude: 1, frequency: 0.25 },
  hat: { amplitude: 0.45, frequency: 0.9 },
};

export const beatPattern = (): Pattern =>
  tapsPattern(BEATS.map((beat) => ({ time: beat.time, ...FEEL[beat.hit] })));
