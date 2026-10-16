import { expect, test } from "bun:test";
import { isProject } from "@buzzzz/core";
import source from "./fixtures/starting-demo-source.json";
import { loadSampleProject } from "../src/features/project/starter/loadSampleProject";

test("sample project preserves every original point, duration and attached media byte", async () => {
  const sample = await loadSampleProject();
  expect(sample.name).toBe("Starting Demo Project");
  expect(isProject(sample.project)).toBe(true);
  expect(sample.project.presets.map((preset) => preset.name)).toEqual(
    source.presets.map((preset) => preset.name),
  );
  for (const original of source.presets) {
    const preset = sample.project.presets.find((preset) => preset.id === original.id);
    expect(preset?.name).toBe(original.name);
    expect(preset?.editor?.durationMs).toBe(original.duration);
    expect(sample.durations?.[original.id]).toBe(original.duration);
    expect(preset?.pattern).toEqual({
      continuousPattern: {
        amplitude: original.intensity.map((point) => ({ time: point.time, value: point.value })),
        frequency: original.frequency.map((point) => ({ time: point.time, value: point.value })),
      },
      discretePattern: original.discrete.map((point) => ({
        time: point.time,
        amplitude: point.intensity,
        frequency: point.frequency,
      })),
    });
  }
  expect(sample.project.presets.map((preset) => preset.pattern.discretePattern.length)).toEqual([
    15, 38, 11,
  ]);
  expect(sample.media?.map((media) => [media.presetId, media.kind, media.file.name])).toEqual([
    ["demo-explosion-animation", "animation", "explosionanimation.json"],
    ["demo-fanfare-sound", "audio", "fanfaresound.mp3"],
  ]);
  const hashes: Record<string, string> = {
    "explosionanimation.json": "edaab5e224d09ba3083397751095858d663dd6522c3ba7a6996f2f71c2ba1c40",
    "fanfaresound.mp3": "572f2ec44b43acca3f3a1a54a63e99b2d3dcddc33f8c36e3c9aa76994741efda",
  };
  for (const media of sample.media ?? []) {
    const digest = await crypto.subtle.digest("SHA-256", await media.file.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    expect(hash).toBe(hashes[media.file.name]);
  }
  sample.project.presets[0].name = "Edited";
  sample.project.presets[0].pattern.discretePattern[0].time = 0;
  const fresh = await loadSampleProject();
  expect(fresh.project.presets[0].name).toBe("ExplosionAnimation");
  expect(fresh.project.presets[0].pattern.discretePattern[0].time).toBe(807);
});
