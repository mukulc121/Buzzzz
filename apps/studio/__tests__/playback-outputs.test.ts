import { expect, test } from "bun:test";
import { derivePlaybackOutputs } from "../src/features/composer/playbackOutputs";

const defaults = {
  mode: "document",
  onPhone: true,
  phones: 0,
  sound: true,
  audio: false,
  animation: false,
} satisfies Parameters<typeof derivePlaybackOutputs>[0];

test.each([
  {
    name: "no phone, with sound",
    input: defaults,
    expected: { devices: 0, sound: true, opensDevicePanel: true },
  },
  {
    name: "no phone, sound off",
    input: { ...defaults, sound: false },
    expected: { devices: 0, sound: false, opensDevicePanel: true },
  },
  {
    name: "connected phones",
    input: { ...defaults, phones: 2 },
    expected: { devices: 2, sound: true, opensDevicePanel: false },
  },
  {
    name: "all outputs off",
    input: { ...defaults, onPhone: false, sound: false },
    expected: { devices: 0, sound: false, opensDevicePanel: false },
  },
  {
    name: "phone preference off",
    input: { ...defaults, onPhone: false, phones: 2 },
    expected: { devices: 0, sound: true, opensDevicePanel: false },
  },
  {
    name: "audio attached",
    input: { ...defaults, audio: true },
    expected: { devices: 0, sound: false, opensDevicePanel: true },
  },
  {
    name: "animation without phone",
    input: { ...defaults, animation: true },
    expected: { devices: 0, sound: true, opensDevicePanel: true },
  },
  {
    name: "animation with phone",
    input: { ...defaults, animation: true, phones: 2 },
    expected: { devices: 2, sound: false, opensDevicePanel: false },
  },
  {
    name: "animation with phone output off",
    input: { ...defaults, animation: true, phones: 2, onPhone: false },
    expected: { devices: 0, sound: true, opensDevicePanel: false },
  },
  {
    name: "audition with outputs off",
    input: { ...defaults, mode: "pattern", sound: false, onPhone: false },
    expected: { devices: 0, sound: true, opensDevicePanel: false },
  },
  {
    name: "audition ignores the document phone preference",
    input: { ...defaults, mode: "pattern", sound: false, onPhone: false, phones: 2 },
    expected: { devices: 2, sound: true, opensDevicePanel: false },
  },
  {
    name: "audition ignores attached media",
    input: { ...defaults, mode: "pattern", sound: false, audio: true, animation: true, phones: 2 },
    expected: { devices: 2, sound: true, opensDevicePanel: false },
  },
] satisfies {
  name: string;
  input: Parameters<typeof derivePlaybackOutputs>[0];
  expected: ReturnType<typeof derivePlaybackOutputs>;
}[])("source output routing: $name", (row) => {
  expect(derivePlaybackOutputs(row.input)).toEqual(row.expected);
});
