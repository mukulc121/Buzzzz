import { expect, test } from "bun:test";
import { emptyPattern } from "@buzzzz/core";
import { strToU8, unzipSync, zipSync } from "fflate";
import { pulsarContentHash, unpackArchive } from "../src/features/imports/archive";
import { exportPulsarBundle } from "../src/features/imports/exportPulsarBundle";
import { readImport } from "../src/features/imports/readImport";

const pattern = {
  ...emptyPattern(),
  discretePattern: [{ time: 0.5, amplitude: 0.75, frequency: 0.5 }],
};
const project = {
  presets: [
    {
      id: "original-one",
      name: "Same name",
      pattern,
      editor: {
        markers: [{ id: "impact", time: 250, label: "Impact" }],
        range: { start: 100, end: 500 },
        durationMs: 1000,
      },
    },
    { id: "original-two", name: "Same name", pattern: emptyPattern() },
  ],
  map: { Click: "original-one" },
  rivePresetId: "original-one",
};
const json = (value: unknown) => strToU8(JSON.stringify(value));
function wav() {
  const bytes = new Uint8Array(16044);
  const view = new DataView(bytes.buffer);
  bytes.set(strToU8("RIFF"));
  view.setUint32(4, bytes.length - 8, true);
  bytes.set(strToU8("WAVEfmt "), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  bytes.set(strToU8("data"), 36);
  view.setUint32(40, 16000, true);
  return new File([bytes], "source.wav", { type: "audio/wav" });
}

test("bundle hash matches an independent canonical SHA-256 format vector", async () => {
  const manifest = {
    schema: "pulsar.bundle/1",
    generator: "fixture",
    id: "com.example.fixture",
    name: "Fixture",
    presets: [{ id: "pulse", name: "Pulse", duration: 0, haptics: "haptics/pulse.json" }],
  };
  const files = { "manifest.json": json(manifest), "haptics/pulse.json": json(emptyPattern()) };
  expect(await pulsarContentHash(files)).toBe(
    "sha256-357c70a999fb6113fbd3bc0fdef8661df7105ba46cc0bd2f775f9161f68610f7",
  );
  files["manifest.json"] = json({ ...manifest, hash: "ignored in canonical manifest digest" });
  expect(await pulsarContentHash(files)).toBe(
    "sha256-357c70a999fb6113fbd3bc0fdef8661df7105ba46cc0bd2f775f9161f68610f7",
  );
});

test("portable exports round-trip patterns, mapping, Rive, original media and trim windows", async () => {
  const audio = wav();
  const animation = new File(
    [JSON.stringify({ v: "5.12.2", fr: 60, ip: 0, op: 60, w: 100, h: 100, layers: [] })],
    "source.json",
  );
  const riv = { name: "source.riv", buffer: strToU8("RIVEpayload").slice().buffer };
  const blob = await exportPulsarBundle({
    project,
    name: "Portable project",
    riv,
    stateMachine: "Main",
    media: [
      {
        presetId: "original-one",
        kind: "audio",
        file: audio,
        window: { startMs: 100, durationMs: 500 },
      },
      { presetId: "original-one", kind: "animation", file: animation },
    ],
  });
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  expect(manifest.schema).toBe("pulsar.bundle/1");
  expect(manifest.generator).toBe("buzzzz");
  expect(manifest.presets.map((preset: { id: string }) => preset.id)).toEqual([
    "sameName",
    "sameName2",
  ]);
  expect(manifest.hash).toBe(await pulsarContentHash(files));
  const imported = await readImport(new File([blob], "portable.anything"));
  if (imported.kind !== "project") throw new Error("Expected project");
  expect(imported.project).toEqual(project);
  expect(imported.name).toBe("Portable project");
  expect(imported.stateMachine).toBe("Main");
  expect(new Uint8Array(imported.riv?.buffer ?? new ArrayBuffer(0))).toEqual(
    new Uint8Array(riv.buffer),
  );
  expect(imported.media).toHaveLength(2);
  const track = imported.media?.find((item) => item.kind === "audio");
  expect(track?.window).toEqual({ startMs: 100, durationMs: 500 });
  expect(await track?.file.arrayBuffer()).toEqual(await audio.arrayBuffer());
  expect(imported.durations?.["original-one"]).toBe(1000);
});

test("invalid portable editor metadata rejects the project before import", async () => {
  const blob = await exportPulsarBundle({ project });
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  expect(manifest.presets[0].duration).toBe(1000);
  delete manifest.hash;
  manifest.buzzzz.editors.sameName.range = { start: 500, end: 100 };
  files["manifest.json"] = json(manifest);
  await expect(
    readImport(new File([zipSync(files).slice()], "invalid-editor.pulsar")),
  ).rejects.toThrow("invalid preset mappings");
});

test("native Pulsar bundles import device and editor haptic representations", async () => {
  const manifest = {
    schema: "pulsar.bundle/1",
    generator: "pulsar-studio",
    name: "Native",
    presets: [{ id: "native", name: "Native", duration: 1000, haptics: "haptics/native.json" }],
  };
  const native = {
    intensity: [
      { time: 0, value: 0.1 },
      { time: 1000, value: 0 },
    ],
    frequency: [],
    discrete: [{ time: 100, intensity: 0.8, frequency: 0.4 }],
  };
  const imported = await readImport(
    new File(
      [zipSync({ "manifest.json": json(manifest), "haptics/native.json": json(native) }).slice()],
      "native.pulsar",
    ),
  );
  if (imported.kind !== "project") throw new Error("Expected project");
  expect(imported.project.presets[0].pattern.discretePattern).toEqual([
    { time: 100, amplitude: 0.8, frequency: 0.4 },
  ]);
  expect(imported.durations).toEqual({ native: 1000 });
});

test("a shared bundle attachment reuses one File across all preset references", async () => {
  const audio = new Uint8Array(await wav().arrayBuffer());
  const manifest = {
    schema: "pulsar.bundle/1",
    presets: Array.from({ length: 1000 }, (_, index) => ({
      id: `preset${index}`,
      name: `Preset ${index}`,
      haptics: "haptics/shared.json",
      audio: { src: "audio/shared.wav" },
    })),
  };
  const imported = await readImport(
    new File(
      [
        zipSync({
          "manifest.json": json(manifest),
          "haptics/shared.json": json(emptyPattern()),
          "audio/shared.wav": audio,
        }).slice(),
      ],
      "shared.pulsar",
    ),
  );
  if (imported.kind !== "project") throw new Error("Expected project");
  expect(imported.media).toHaveLength(1000);
  expect(new Set(imported.media?.map((item) => item.file)).size).toBe(1);
  expect(imported.project.presets[0].pattern).toBe(imported.project.presets[999].pattern);
});

test("repeated haptics paths obey the logical byte budget before any JSON parsing", async () => {
  const presets = Array.from({ length: 1000 }, (_, index) => ({
    id: `p${index}`,
    name: "Shared",
    haptics: "haptics/shared.json",
  }));
  const archive = zipSync({
    "manifest.json": json({ schema: "pulsar.bundle/1", presets }),
    "haptics/shared.json": strToU8(`${" ".repeat(22000)}not JSON`),
  });
  await expect(readImport(new File([archive.slice()], "amplified.pulsar"))).rejects.toThrow(
    "20 MB logical project limit",
  );
});

test("tampering and any invalid referenced pattern reject the entire project", async () => {
  const blob = await exportPulsarBundle({ project });
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  files["haptics/sameName.json"] = json(emptyPattern());
  await expect(readImport(new File([zipSync(files).slice()], "tampered.pulsar"))).rejects.toThrow(
    "content hash",
  );
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  delete manifest.hash;
  files["manifest.json"] = json(manifest);
  files["haptics/sameName2.json"] = json({ discretePattern: "invalid" });
  await expect(readImport(new File([zipSync(files).slice()], "invalid.pulsar"))).rejects.toThrow(
    "haptic data",
  );
});

test("archive traversal, excessive members, and oversized declared expansion reject before import", () => {
  expect(() => unpackArchive(zipSync({ "../outside.json": json({}) }))).toThrow("unsafe file path");
  expect(() =>
    unpackArchive(
      zipSync(
        Object.fromEntries(
          Array.from({ length: 1025 }, (_, index) => [`files/${index}`, new Uint8Array()]),
        ),
      ),
    ),
  ).toThrow("1,024 file");
  const oversized = zipSync({ "member.bin": new Uint8Array([1]) });
  const view = new DataView(oversized.buffer, oversized.byteOffset, oversized.byteLength);
  for (let index = 0; index < oversized.length - 28; index++)
    if (view.getUint32(index, true) === 0x02014b50)
      view.setUint32(index + 24, 20 * 1024 * 1024 + 1, true);
  expect(() => unpackArchive(oversized)).toThrow("20 MB member");
});
