import { BEATS, TRACK_MS } from "./beats";

export const SAMPLE_RATE = 22050;

// Deterministic noise so the generated fixture is byte-stable.
function noise(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff - 0.5;
  };
}

function kick(t: number) {
  const phase = 2 * Math.PI * (50 * t + 70 * 0.04 * (1 - Math.exp(-t / 0.04)));
  return Math.sin(phase) * Math.exp(-t / 0.12);
}

export function synthesize(): Float32Array {
  const out = new Float32Array(Math.round((TRACK_MS / 1000) * SAMPLE_RATE));
  const rand = noise(7);
  for (const beat of BEATS) {
    const start = Math.round((beat.time / 1000) * SAMPLE_RATE);
    const length = Math.round((beat.hit === "kick" ? 0.35 : 0.06) * SAMPLE_RATE);
    for (let i = 0; i < length && start + i < out.length; i++) {
      const t = i / SAMPLE_RATE;
      out[start + i] += beat.hit === "kick" ? 0.8 * kick(t) : 0.3 * rand() * Math.exp(-t / 0.015);
    }
  }
  return out;
}

export function encodeWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) =>
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true),
  );
  return bytes;
}
