import { expect, test } from "bun:test";
import { decodeAudioFile } from "../src/features/audio/decode";
import { readImport } from "../src/features/imports/readImport";

function wav(channels = 2) {
  const rate = 8000;
  const bytes = new Uint8Array(44 + rate * channels * 2);
  const view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode("RIFF"));
  view.setUint32(4, bytes.length - 8, true);
  bytes.set(new TextEncoder().encode("WAVEfmt "), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  bytes.set(new TextEncoder().encode("data"), 36);
  view.setUint32(40, rate * channels * 2, true);
  return new File([bytes], "sound.wav", { type: "audio/wav" });
}
async function withDecoder(run: (calls: { contexts: number; decodes: number }) => Promise<void>) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  const calls = { contexts: 0, decodes: 0 };
  class Context {
    sampleRate = 44100;
    constructor() {
      calls.contexts++;
    }
    async close() {}
    async decodeAudioData() {
      calls.decodes++;
      return {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 1,
        getChannelData: () => new Float32Array(44100),
      };
    }
  }
  Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: Context });
  try {
    await run(calls);
  } finally {
    if (previous) Object.defineProperty(globalThis, "AudioContext", previous);
    else Reflect.deleteProperty(globalThis, "AudioContext");
  }
}

test("compressed Opus exceeding 60 seconds rejects before creating a Web Audio decoder", async () => {
  const bytes = await Bun.file(
    new URL("./fixtures/long-silent.ogg", import.meta.url),
  ).arrayBuffer();
  expect(bytes.byteLength).toBeLessThan(100000);
  await withDecoder(async (calls) => {
    const file = new File([bytes], "long.ogg", { type: "audio/ogg" });
    await expect(decodeAudioFile(file)).rejects.toThrow("60 seconds");
    await expect(readImport(file)).rejects.toThrow("60 seconds");
    expect(calls).toEqual({ contexts: 0, decodes: 0 });
  });
});

test("metadata validation then concurrent track loads decode a valid stable File exactly once", async () => {
  await withDecoder(async (calls) => {
    const imported = await readImport(wav());
    if (imported.kind !== "audio") throw new Error("Expected audio");
    expect(calls).toEqual({ contexts: 0, decodes: 0 });
    const [first, second] = await Promise.all([
      decodeAudioFile(imported.file),
      decodeAudioFile(imported.file),
    ]);
    expect(first).toBe(second);
    expect(first.durationMs).toBe(1000);
    expect(calls).toEqual({ contexts: 1, decodes: 1 });
  });
});

test("invalid container metadata and excessive channels cannot reach the decoder", async () => {
  await withDecoder(async (calls) => {
    await expect(decodeAudioFile(wav(9))).rejects.toThrow("8 channels");
    await expect(decodeAudioFile(new Blob(["not audio"]))).rejects.toBeInstanceOf(Error);
    expect(calls).toEqual({ contexts: 0, decodes: 0 });
  });
});

test("WAV container and PCM inconsistencies reject before any decoder is allocated", async () => {
  const source = new Uint8Array(await wav().arrayBuffer());
  const variants: Uint8Array[] = [];
  for (const [offset, value, short] of [
    [4, 4000, false],
    [4, source.length + 8, false],
    [40, source.length * 2, false],
    [28, 999999, false],
    [32, 8, true],
  ] as const) {
    const bytes = source.slice();
    const view = new DataView(bytes.buffer);
    if (short) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
    variants.push(bytes);
  }
  const trailing = new Uint8Array(source.length + 1);
  trailing.set(source);
  new DataView(trailing.buffer).setUint32(4, trailing.length - 8, true);
  variants.push(trailing);
  await withDecoder(async (calls) => {
    for (const bytes of variants) {
      await expect(decodeAudioFile(new Blob([bytes.slice()]))).rejects.toThrow("WAV container");
      await expect(readImport(new File([bytes.slice()], "invalid.wav"))).rejects.toThrow(
        "WAV container",
      );
    }
    expect(calls).toEqual({ contexts: 0, decodes: 0 });
  });
});
