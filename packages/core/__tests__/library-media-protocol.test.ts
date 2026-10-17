import { expect, test } from "bun:test";
import { emptyPattern, MAX_PATTERN_MS } from "../src/patterns/pattern.ts";
import { parseMessage, type Msg } from "../src/relay/protocol.ts";
import { isRelayMessageAllowed } from "../src/relay/roles.ts";

const assetPath = `/v1/rooms/${"a".repeat(32)}/assets/${"b".repeat(32)}.bin`;
const signedPath = `${assetPath}?token=${"c".repeat(43)}`;
const audio: Extract<Msg, { type: "audio-haptics" }> = {
  type: "audio-haptics",
  resourceId: "project-a-pattern-a",
  name: "FanfareSound",
  version: "ab".repeat(32),
  durationMs: 5187,
  pattern: {
    discretePattern: [{ time: 1000, amplitude: 0.8, frequency: 0.4 }],
    continuousPattern: { amplitude: [{ time: 4000, value: 0.2 }], frequency: [] },
  },
  audio: {
    clipId: "de".repeat(32),
    downloadUrl: `https://buzzzz.theclau.de${signedPath}`,
    contentType: "audio/mpeg",
    size: 12345,
  },
};
const animation: Extract<Msg, { type: "animation-haptics" }> = {
  type: "animation-haptics",
  resourceId: "project-a-pattern-b",
  name: "ExplosionAnimation",
  version: "ef".repeat(32),
  durationMs: 2333,
  pattern: emptyPattern(),
  animation: {
    clipId: "fa".repeat(32),
    downloadUrl: `https://buzzzz.theclau.de${signedPath}`,
    contentType: "application/json",
    size: 23456,
    totalFrames: 140,
    frameRate: 60,
    width: 512,
    height: 512,
  },
};
const parse = (value: unknown) => parseMessage(JSON.stringify(value));

test("received media round trips the source clip, animation metadata and playback settings", () => {
  for (const message of [
    audio,
    animation,
    { ...audio, volume: 0, offsetMs: 120, window: { startMs: 70000, durationMs: 5000 } },
    {
      ...animation,
      animation: { ...animation.animation, contentType: "application/zip+dotlottie" },
    },
    {
      ...animation,
      animation: { ...animation.animation, contentType: "video/mp4", totalFrames: 0 },
    },
  ])
    expect(parse(message)).toEqual(message);
  expect(
    parse({
      ...audio,
      transportToken: "not part of the message",
      audio: { ...audio.audio, headers: { authorization: "not part of the clip" } },
      window: { startMs: 0, durationMs: 100, ignored: true },
    }),
  ).toEqual({ ...audio, window: { startMs: 0, durationMs: 100 } });
});

test("media downloads accept signed hosted, loopback and private IPv4 room URLs", () => {
  for (const origin of [
    "https://buzzzz.theclau.de",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.255.255.254:5173",
    "http://[::1]:5173",
    "http://10.0.0.1:5173",
    "http://172.16.0.1:5173",
    "http://172.31.255.254:5173",
    "http://192.168.0.111:5173",
  ]) {
    const message = { ...audio, audio: { ...audio.audio, downloadUrl: `${origin}${signedPath}` } };
    expect(parse(message)).toEqual(message);
  }
  for (const downloadUrl of [
    signedPath,
    `http://buzzzz.theclau.de${signedPath}`,
    `http://8.8.8.8${signedPath}`,
    `http://169.254.169.254${signedPath}`,
    `http://172.15.255.255${signedPath}`,
    `http://172.32.0.1${signedPath}`,
    `http://192.169.0.1${signedPath}`,
    `http://192.168.0.111.example.com${signedPath}`,
    `https://user:password@buzzzz.theclau.de${signedPath}`,
    `https://buzzzz.theclau.de${signedPath}#clip`,
    `https://buzzzz.theclau.de${signedPath}&extra=true`,
    `https://buzzzz.theclau.de${signedPath}&token=${"d".repeat(43)}`,
    `https://buzzzz.theclau.de${assetPath}?token=${"c".repeat(42)}`,
    `https://buzzzz.theclau.de${assetPath}`,
    `https://buzzzz.theclau.de${signedPath.replace(".bin", ".riv")}`,
    `https://buzzzz.theclau.de${signedPath.replace("/assets/", "/other/")}`,
    `https://buzzzz.theclau.de${signedPath.replace("a".repeat(32), "room")}`,
    `https://${"x".repeat(1024)}.example.com${signedPath}`,
    "file:///private/clip.mp3",
    "data:audio/mpeg;base64,AAAA",
    "not a URL",
  ])
    expect(parse({ ...audio, audio: { ...audio.audio, downloadUrl } })).toBeNull();
});

test("received media applies existing pattern, identity and finite playback bounds", () => {
  const maximum = {
    ...audio,
    resourceId: "x".repeat(512),
    name: "x".repeat(512),
    durationMs: MAX_PATTERN_MS,
    volume: 1,
    offsetMs: MAX_PATTERN_MS,
    window: { startMs: 120000, durationMs: MAX_PATTERN_MS },
    audio: { ...audio.audio, size: 20 * 1024 * 1024 },
  };
  expect(parse(maximum)).toEqual(maximum);
  expect(parse({ ...audio, durationMs: 0, name: "", pattern: emptyPattern() })).not.toBeNull();
  for (const change of [
    { resourceId: "" },
    { resourceId: "x".repeat(513) },
    { name: "x".repeat(513) },
    { version: "" },
    { version: "AB".repeat(32) },
    { version: "ab".repeat(31) },
    { durationMs: -1 },
    { durationMs: MAX_PATTERN_MS + 1 },
    { durationMs: Infinity },
    { durationMs: "1000" },
    { pattern: {} },
    {
      pattern: {
        ...emptyPattern(),
        discretePattern: [{ time: MAX_PATTERN_MS + 1, amplitude: 1, frequency: 1 }],
      },
    },
    { volume: -0.1 },
    { volume: 1.01 },
    { volume: NaN },
    { volume: null },
    { offsetMs: -1 },
    { offsetMs: MAX_PATTERN_MS + 1 },
    { offsetMs: null },
    { window: null },
    { window: {} },
    { window: { startMs: -1, durationMs: 100 } },
    { window: { startMs: 0, durationMs: 0 } },
    { window: { startMs: 0, durationMs: MAX_PATTERN_MS + 1 } },
    { window: { startMs: Infinity, durationMs: 100 } },
    { window: { startMs: Number.MAX_SAFE_INTEGER, durationMs: 100 } },
    { window: { startMs: 0, durationMs: "100" } },
  ])
    expect(parse({ ...audio, ...change })).toBeNull();
});

test("clips reject unsafe cache paths, unsupported media, unbounded sizes and missing animation metadata", () => {
  for (const change of [
    { clipId: "" },
    { clipId: "x".repeat(513) },
    { clipId: "." },
    { clipId: ".." },
    { clipId: "folder/clip" },
    { clipId: "folder\\clip" },
    { clipId: "clip\0" },
    { contentType: "application/json" },
    { contentType: "audio/mpeg; charset=utf-8" },
    { contentType: "audio/" },
    { size: 0 },
    { size: -1 },
    { size: 0.5 },
    { size: 20 * 1024 * 1024 + 1 },
    { size: Number.MAX_SAFE_INTEGER + 1 },
    { size: "100" },
  ])
    expect(parse({ ...audio, audio: { ...audio.audio, ...change } })).toBeNull();
  expect(parse({ ...audio, audio: undefined })).toBeNull();
  expect(parse({ ...animation, animation: audio.audio })).toBeNull();
  for (const field of ["totalFrames", "frameRate", "width", "height"]) {
    expect(
      parse({ ...animation, animation: { ...animation.animation, [field]: undefined } }),
    ).toBeNull();
    for (const invalid of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "60", null])
      expect(
        parse({ ...animation, animation: { ...animation.animation, [field]: invalid } }),
      ).toBeNull();
  }
  for (const field of ["frameRate", "width", "height"])
    expect(parse({ ...animation, animation: { ...animation.animation, [field]: 0 } })).toBeNull();
});

test("only hosts can send either received-media message", () => {
  for (const type of [audio.type, animation.type]) {
    expect(isRelayMessageAllowed("host", type)).toBe(true);
    expect(isRelayMessageAllowed("phone", type)).toBe(false);
  }
});
