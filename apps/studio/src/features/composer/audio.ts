import { toDevice, type Pattern } from "@buzzzz/core";

// Intensity drives gain, frequency drives pitch, and taps become short clicks.
let ctx: AudioContext | undefined;
let live: AudioScheduledSourceNode[] = [];

const pitch = (f: number) => 60 + f * 240; // Hz

export function stopSound() {
  live.forEach((n) => n.stop());
  live = [];
}

export function playSound(pattern: Pattern) {
  stopSound();
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  const t0 = ctx.currentTime + 0.03;
  const p = toDevice(pattern);
  const { amplitude, frequency } = p.continuousPattern;

  if (amplitude.length) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    gain.gain.setValueAtTime(0, t0);
    for (const pt of amplitude)
      gain.gain.linearRampToValueAtTime(pt.value * 0.25, t0 + pt.time / 1000);
    gain.gain.linearRampToValueAtTime(0, t0 + amplitude.at(-1)!.time / 1000 + 0.01);
    osc.frequency.setValueAtTime(pitch(frequency[0]?.value ?? 0.5), t0);
    for (const pt of frequency)
      osc.frequency.linearRampToValueAtTime(pitch(pt.value), t0 + pt.time / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + amplitude.at(-1)!.time / 1000 + 0.05);
    live.push(osc);
  }

  for (const tap of p.discretePattern) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = t0 + tap.time / 1000;
    osc.type = "square";
    osc.frequency.value = pitch(tap.frequency) * 2;
    gain.gain.setValueAtTime(tap.amplitude * 0.35, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.04);
    live.push(osc);
  }
}
