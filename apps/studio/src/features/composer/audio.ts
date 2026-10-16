import { toDevice, type Pattern } from "@buzzzz/core";
import { schedulePatternSound } from "./soundGraph";

let ctx: AudioContext | undefined;
let stop: (() => void) | undefined;

export function stopSound() {
  stop?.();
  stop = undefined;
}

export function playSound(pattern: Pattern) {
  stopSound();
  ctx ??= new AudioContext({ sampleRate: 44100 });
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  stop = schedulePatternSound(ctx, toDevice(pattern), ctx.currentTime + 0.03);
}
