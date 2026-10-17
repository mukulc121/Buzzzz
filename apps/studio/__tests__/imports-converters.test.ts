import { expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import { strToU8, zipSync } from "fflate";
import { readImport } from "../src/features/imports/readImport";

const jsonFile = (value: unknown, name = "pattern.json") => new File([JSON.stringify(value)], name);
function at(points: { time: number; value: number }[], time: number) {
  const index = points.findIndex((point) => point.time >= time);
  if (index < 0) return points.at(-1)?.value ?? 0;
  if (!index) return points[0].value;
  const before = points[index - 1];
  const after = points[index];
  return (
    before.value +
    ((after.value - before.value) * (time - before.time)) / (after.time - before.time)
  );
}

test("content, not extension, identifies Rive, Lottie and supported audio", async () => {
  expect((await readImport(new File(["RIVEpayload"], "renamed.json"))).kind).toBe("rive");
  const lottie = { fr: 60, ip: 0, op: 60, w: 100, h: 100, layers: [] };
  expect((await readImport(jsonFile(lottie, "renamed.mp3"))).kind).toBe("animation");
  const zipped = zipSync({
    "manifest.json": strToU8(JSON.stringify({ version: "2", animations: [{ id: "test" }] })),
    "a/test.json": strToU8(JSON.stringify(lottie)),
  });
  expect((await readImport(new File([zipped.slice()], "renamed.pulsar"))).kind).toBe("animation");
  const wav = new Uint8Array(46);
  const view = new DataView(wav.buffer);
  wav.set(strToU8("RIFF"));
  view.setUint32(4, 38, true);
  wav.set(strToU8("WAVEfmt "), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  wav.set(strToU8("data"), 36);
  view.setUint32(40, 2, true);
  const audio = await readImport(new File([wav], "renamed.png", { type: "image/png" }));
  expect(audio.kind).toBe("audio");
  if (audio.kind !== "audio") throw new Error("Expected audio");
  expect(audio.file.type).toBe("audio/wav");
  await expect(
    readImport(new File(["not audio"], "fake.mp3", { type: "audio/mpeg" })),
  ).rejects.toThrow("supported");
});

test("AHAP continuous envelopes and global controls convert seconds to milliseconds", async () => {
  const imported = await readImport(
    jsonFile(
      {
        Version: 1,
        Pattern: [
          {
            Event: {
              EventType: "HapticContinuous",
              Time: 0.1,
              EventDuration: 0.9,
              EventParameters: [
                { ParameterID: "HapticIntensity", ParameterValue: 0.8 },
                { ParameterID: "HapticSharpness", ParameterValue: 0.25 },
              ],
            },
          },
          {
            ParameterCurve: {
              ParameterID: "HapticIntensityControl",
              Time: 0.1,
              ParameterCurveControlPoints: [
                { Time: 0, ParameterValue: 1 },
                { Time: 0.9, ParameterValue: 0.5 },
              ],
            },
          },
          { Parameter: { ParameterID: "HapticSharpnessControl", Time: 0.5, ParameterValue: 0.25 } },
          {
            Event: {
              EventType: "HapticTransient",
              Time: 0.55,
              EventParameters: [
                { ParameterID: "HapticIntensity", ParameterValue: 0.6 },
                { ParameterID: "HapticSharpness", ParameterValue: 0.9 },
              ],
            },
          },
        ],
      },
      "native.ahap",
    ),
  );
  if (imported.kind !== "pattern") throw new Error("Expected converted AHAP");
  expect(isPattern(imported.pattern)).toBe(true);
  expect(imported.pattern.discretePattern).toEqual([
    { time: 550, amplitude: 0.45, frequency: 0.9 },
  ]);
  expect(at(imported.pattern.continuousPattern.amplitude, 550)).toBeCloseTo(0.6, 2);
  expect(at(imported.pattern.continuousPattern.amplitude, 1000)).toBe(0);
  expect(at(imported.pattern.continuousPattern.frequency, 400)).toBe(0.25);
  expect(at(imported.pattern.continuousPattern.frequency, 600)).toBe(0.5);
});

test("AHAP overlapping layers and omitted audio disclose conversion limits", async () => {
  const imported = await readImport(
    jsonFile({
      Version: 1,
      Pattern: [
        {
          Event: {
            EventType: "HapticContinuous",
            Time: 0,
            EventDuration: 1,
            EventParameters: [
              { ParameterID: "HapticIntensity", ParameterValue: 0.4 },
              { ParameterID: "HapticSharpness", ParameterValue: 0.2 },
            ],
          },
        },
        {
          Event: {
            EventType: "HapticContinuous",
            Time: 0.5,
            EventDuration: 1,
            EventParameters: [
              { ParameterID: "HapticIntensity", ParameterValue: 0.8 },
              { ParameterID: "HapticSharpness", ParameterValue: 0.8 },
            ],
          },
        },
        { Event: { EventType: "AudioCustom", Time: 0, EventWaveformPath: "sound.wav" } },
      ],
    }),
  );
  if (imported.kind !== "pattern") throw new Error("Expected AHAP");
  expect(at(imported.pattern.continuousPattern.amplitude, 750)).toBe(0.8);
  expect(at(imported.pattern.continuousPattern.frequency, 750)).toBeCloseTo(0.6, 3);
  expect(imported.warnings?.join(" ")).toContain("Overlapping");
  expect(imported.warnings?.join(" ")).toContain("audio events");
  await expect(
    readImport(jsonFile({ Pattern: [{ Event: { EventType: "HapticTransient", Time: -1 } }] })),
  ).rejects.toThrow("AHAP event time");
});

test("Lofelt envelopes and emphasis convert without losing independent transient strength", async () => {
  const value = {
    version: { major: 1, minor: 0, patch: 0 },
    metadata: {},
    signals: {
      continuous: {
        envelopes: {
          amplitude: [
            { time: 0, amplitude: 0 },
            { time: 0.5, amplitude: 0.4, emphasis: { amplitude: 0.9, frequency: 0.7 } },
            { time: 1, amplitude: 0 },
          ],
          frequency: [
            { time: 0, frequency: 0.2 },
            { time: 1, frequency: 0.8 },
          ],
        },
      },
    },
  };
  const imported = await readImport(jsonFile(value, "lofelt.haptic"));
  if (imported.kind !== "pattern") throw new Error("Expected Lofelt");
  expect(imported.pattern.discretePattern).toEqual([{ time: 500, amplitude: 0.9, frequency: 0.7 }]);
  expect(imported.pattern.continuousPattern.amplitude[1]).toEqual({ time: 500, value: 0.4 });
  expect(imported.pattern.continuousPattern.frequency.at(-1)).toEqual({ time: 1000, value: 0.8 });
  await expect(
    readImport(jsonFile({ ...value, version: { major: 2, minor: 0, patch: 0 } })),
  ).rejects.toThrow("version 1");
});
