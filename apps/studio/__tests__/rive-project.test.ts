import { expect, test } from "bun:test";
import { emptyPattern, isRiveConfig } from "@buzzzz/core";
import { pulsarPresets } from "@buzzzz/core/presets";
import { strToU8, unzipSync, zipSync } from "fflate";
import { exportPulsarBundle } from "../src/features/imports/exportPulsarBundle";
import { readImport } from "../src/features/imports/readImport";
import { DEX_RIVE_CONFIG } from "../src/features/project/starter/rive/dex-rive-config";
import { systemImpactPattern } from "../src/features/rive/systemImpactPattern";
import { selectExportProject } from "../src/features/export/model";
import { riveHapticAction } from "../src/features/rive/hapticAction";
import { normalizeDexConfig } from "../src/features/project/starter/rive/normalizeDexConfig";

const project = {
  presets: [{ id: "dex", name: "DexTourLoader", pattern: emptyPattern() }],
  map: {},
  riveConfig: DEX_RIVE_CONFIG,
  rivePresetId: "dex",
};

test("only the unchanged legacy Dex starter inherits the source native-sound policy", () => {
  const { nativeSound: _sound, ...legacy } = DEX_RIVE_CONFIG;
  expect(normalizeDexConfig(legacy, "dex-tour-loader")).toEqual(DEX_RIVE_CONFIG);
  expect(normalizeDexConfig(legacy, "custom")).toBe(legacy);
  const custom = {
    ...legacy,
    haptics: { ...legacy.haptics, hapticEntry: legacy.haptics.hapticLoop },
  };
  expect(normalizeDexConfig(custom, "dex-tour-loader")).toBe(custom);
  const explicit = { ...legacy, nativeSound: true };
  expect(normalizeDexConfig(explicit, "dex-tour-loader")).toBe(explicit);
});

test("VM trigger names cannot resolve inherited actions but explicit prototype-name cues work", () => {
  for (const name of ["constructor", "toString", "__proto__"])
    expect(riveHapticAction(DEX_RIVE_CONFIG.haptics, name)).toBeUndefined();
  const own: unknown = JSON.parse(
    '{"haptics":{"constructor":{"kind":"sequence","immediate":"impactSoft","cues":[]}}}',
  );
  if (!isRiveConfig(own)) throw new Error("Expected a valid own-property cue");
  expect(riveHapticAction(own.haptics, "constructor")).toEqual({
    kind: "sequence",
    immediate: "impactSoft",
    cues: [],
  });
});

test("portable and JSON project imports preserve the complete Rive script", async () => {
  const riv = { name: "loader.riv", buffer: strToU8("RIVEpayload").slice().buffer };
  const blob = await exportPulsarBundle({ project, riv, stateMachine: "stateMachine" });
  const imported = await readImport(new File([blob], "loader.pulsar"));
  expect(imported).toMatchObject({ kind: "project", project, stateMachine: "stateMachine", riv });
  const json = await readImport(new File([JSON.stringify(project)], "loader.json"));
  expect(json).toMatchObject({ kind: "project", project });
});

test("malformed Rive scripts cannot be silently dropped by either project import path", async () => {
  const bad = { ...DEX_RIVE_CONFIG, haptics: { event: { kind: "sequence", cues: [] } } };
  await expect(
    readImport(new File([JSON.stringify({ ...project, riveConfig: bad })], "bad.json")),
  ).rejects.toThrow("Invalid project presets or mappings");
  const files = unzipSync(
    new Uint8Array(await (await exportPulsarBundle({ project })).arrayBuffer()),
  );
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  delete manifest.hash;
  manifest.buzzzz.riveConfig = bad;
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  await expect(readImport(new File([zipSync(files).slice()], "bad.pulsar"))).rejects.toThrow(
    "invalid preset mappings",
  );
});

test("pattern selection retains the Rive asset and configuration only with its owner", async () => {
  const selected = selectExportProject(
    {
      ...project,
      riveStateMachine: "stateMachine",
      presets: [...project.presets, { id: "other", name: "Other", pattern: emptyPattern() }],
    },
    { presetIds: ["dex"], includeAudio: false, includeAnimation: false },
  );
  const riv = { name: "loader.riv", buffer: strToU8("RIVEpayload").slice().buffer };
  const blob = await exportPulsarBundle({
    project: selected,
    riv,
    stateMachine: selected.riveStateMachine,
  });
  const imported = await readImport(new File([blob], "selection.pulsar"));
  expect(imported).toMatchObject({
    kind: "project",
    project: { presets: project.presets, riveConfig: DEX_RIVE_CONFIG, rivePresetId: "dex" },
    stateMachine: "stateMachine",
    riv,
  });
  const excluded = selectExportProject(
    {
      ...project,
      presets: [...project.presets, { id: "other", name: "Other", pattern: emptyPattern() }],
    },
    { presetIds: ["other"], includeAudio: false, includeAnimation: false },
  );
  const without = await readImport(
    new File([await exportPulsarBundle({ project: excluded, riv })], "without.pulsar"),
  );
  expect(without).toMatchObject({ kind: "project", riv: null, project: { rivePresetId: null } });
  if (without.kind !== "project") throw new Error("Expected a project");
  expect(without.project.riveConfig).toBeUndefined();
  expect(without.stateMachine).toBeUndefined();
});

test("speaker system impacts use the published iOS catalog patterns", () => {
  for (const [impact, name] of [
    ["impactSoft", "SystemImpactSoft"],
    ["impactLight", "SystemImpactLight"],
    ["impactMedium", "SystemImpactMedium"],
  ] satisfies [Parameters<typeof systemImpactPattern>[0], string][]) {
    const original = pulsarPresets.find(
      (preset) => preset.name === name && preset.tags.includes("iOS"),
    );
    expect(original).toBeDefined();
    expect(systemImpactPattern(impact)).toBe(original?.pattern);
  }
});
