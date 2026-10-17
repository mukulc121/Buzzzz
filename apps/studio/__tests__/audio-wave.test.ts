import { expect, test } from "bun:test";
import { readAudioMetadata } from "../src/features/audio/metadata";
import { validateWaveContainer } from "../src/features/audio/wave";

const put = (bytes: Uint8Array, offset: number, value: string) =>
  bytes.set(new TextEncoder().encode(value), offset);
function wave(big = false) {
  const bytes = new Uint8Array(80044);
  const view = new DataView(bytes.buffer);
  put(bytes, 0, big ? "RIFX" : "RIFF");
  view.setUint32(4, bytes.length - 8, !big);
  put(bytes, 8, "WAVEfmt ");
  view.setUint32(16, 16, !big);
  view.setUint16(20, 1, !big);
  view.setUint16(22, 1, !big);
  view.setUint32(24, 8000, !big);
  view.setUint32(28, 8000, !big);
  view.setUint16(32, 1, !big);
  view.setUint16(34, 8, !big);
  put(bytes, 36, "data");
  view.setUint32(40, 80000, !big);
  bytes.fill(128, 44);
  return bytes;
}
function rf64() {
  const source = wave();
  const bytes = new Uint8Array(source.length + 36);
  bytes.set(source.subarray(0, 12));
  bytes.set(source.subarray(12), 48);
  const view = new DataView(bytes.buffer);
  put(bytes, 0, "RF64");
  view.setUint32(4, 0xffffffff, true);
  put(bytes, 12, "ds64");
  view.setUint32(16, 28, true);
  view.setBigUint64(20, BigInt(bytes.length - 8), true);
  view.setBigUint64(28, 80000n, true);
  view.setBigUint64(36, 80000n, true);
  view.setUint32(76, 0xffffffff, true);
  return bytes;
}
test("complete RIFF, big-endian RIFX, and RF64 containers keep their actual duration", async () => {
  for (const bytes of [wave(), wave(true), rf64()]) {
    await expect(validateWaveContainer(new Blob([bytes.slice()]))).resolves.toBeUndefined();
    expect((await readAudioMetadata(new Blob([bytes.slice()]))).durationMs).toBe(10000);
  }
});
test("outer size lies reject for RIFF, RIFX, and RF64 before metadata can truncate audio", async () => {
  for (const [bytes, little] of [
    [wave(), true],
    [wave(true), false],
  ] satisfies [Uint8Array, boolean][]) {
    new DataView(bytes.buffer).setUint32(4, 8036, little);
    await expect(readAudioMetadata(new Blob([bytes.slice()]))).rejects.toThrow("WAV container");
  }
  for (const offset of [20, 28, 36]) {
    const bytes = rf64();
    new DataView(bytes.buffer).setBigUint64(offset, 8000n, true);
    await expect(readAudioMetadata(new Blob([bytes]))).rejects.toThrow("WAV container");
  }
});
test("duplicate audio/format chunks and contradictory sample counts reject", async () => {
  for (const chunk of ["data", "fmt ", "fact"]) {
    const source = wave();
    const payload = chunk === "fmt " ? source.slice(20, 36) : new Uint8Array(4);
    const bytes = new Uint8Array(source.length + 8 + payload.length);
    bytes.set(source);
    put(bytes, source.length, chunk);
    bytes.set(payload, source.length + 8);
    const view = new DataView(bytes.buffer);
    view.setUint32(4, bytes.length - 8, true);
    view.setUint32(source.length + 4, payload.length, true);
    if (chunk === "fact") view.setUint32(source.length + 8, 1, true);
    await expect(readAudioMetadata(new Blob([bytes]))).rejects.toThrow("WAV container");
  }
});
