import { toDevice, type Pattern } from "@buzzzz/core";
import { schedulePatternSound, soundDuration } from "./soundGraph";

const SAMPLE_RATE = 44100;
// Pulsar pads the tap tail of its rendered buffer with 100ms of silence.
const TAIL_PAD = 0.1;
// Headroom for the start message to reach the audio thread.
const START_LEAD = 0.03;

let ctx: AudioContext | undefined;
let source: AudioBufferSourceNode | undefined;
// The playback that owns the shared source; it's told when another one takes over.
let owner: { current: () => void } | undefined;
// Bumped on every stop or start so a pending playSound can't override newer output.
let generation = 0;

export function stopSound(by?: { current: () => void }) {
  if (by && owner && by !== owner) return;
  generation++;
  source?.stop();
  source = undefined;
  owner = undefined;
}

async function resumed() {
  ctx ??= new AudioContext({ sampleRate: SAMPLE_RATE });
  if (ctx.state !== "running") await ctx.resume();
  return ctx;
}

// Renders offline from time 0, as Pulsar does, so live output is its exact PCM.
export function renderSound(pattern: Pattern) {
  const device = toDevice(pattern);
  const { amplitude } = device.continuousPattern;
  const continuous = (amplitude.at(-1)?.time ?? 0) / 1000 + 0.01;
  const taps = soundDuration({ ...device, continuousPattern: { amplitude: [], frequency: [] } });
  const length = Math.max(1, Math.floor(Math.max(continuous, taps + TAIL_PAD) * SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  schedulePatternSound(offline, device, 0);
  return offline.startRendering();
}

export async function prepareSound(pattern: Pattern, prepared?: AudioBuffer) {
  const [, buffer] = await Promise.all([resumed(), prepared ?? renderSound(pattern)]);
  return buffer;
}

export function soundNow() {
  return (ctx?.currentTime ?? 0) * 1000;
}

// Plays from offsetMs into the buffer; returns the buffer's time zero on the soundNow() clock.
export function playBuffer(buffer: AudioBuffer, offsetMs = 0, by?: { current: () => void }) {
  const previous = owner;
  stopSound();
  if (previous && previous !== by) previous.current();
  owner = by;
  if (!ctx) throw new Error("Sound is not prepared");
  const node = ctx.createBufferSource();
  node.buffer = buffer;
  node.connect(ctx.destination);
  node.addEventListener("ended", () => node.disconnect(), { once: true });
  source = node;
  // A start time that maps back to a whole frame keeps the PCM uninterpolated.
  let frame = Math.ceil((ctx.currentTime + START_LEAD) * SAMPLE_RATE);
  while ((frame / SAMPLE_RATE) * SAMPLE_RATE !== frame) frame++;
  const when = frame / SAMPLE_RATE;
  node.start(when, offsetMs / 1000);
  return when * 1000 - offsetMs;
}

export function playSound(pattern: Pattern) {
  stopSound();
  const current = generation;
  void prepareSound(pattern)
    .then((buffer) => {
      if (current === generation) playBuffer(buffer);
    })
    .catch(() => {});
}
