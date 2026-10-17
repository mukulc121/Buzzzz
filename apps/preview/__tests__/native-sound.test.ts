import { expect, test } from "bun:test";
import { deriveNativeSound } from "../src/features/playback/nativeSound";

test.each([
  { preference: true, pathname: "/", expected: true },
  { preference: false, pathname: "/", expected: false },
  { preference: true, pathname: "/presets", riveConfig: { nativeSound: false }, expected: true },
  { preference: false, pathname: "/presets", riveConfig: { nativeSound: true }, expected: false },
  { preference: true, pathname: "/demos", riveConfig: { nativeSound: false }, expected: true },
  {
    preference: true,
    pathname: "/mediaLibraryModal",
    riveConfig: { nativeSound: false },
    expected: true,
  },
  {
    preference: true,
    pathname: "/demos/rive-demo",
    riveConfig: { nativeSound: false },
    expected: false,
  },
  {
    preference: false,
    pathname: "/demos/rive-demo",
    riveConfig: { nativeSound: true },
    expected: true,
  },
  { preference: true, pathname: "/preview", expected: true },
  { preference: false, pathname: "/preview", expected: false },
  { preference: true, pathname: "/preview", riveConfig: {}, expected: true },
  { preference: false, pathname: "/preview", riveConfig: {}, expected: false },
  { preference: true, pathname: "/preview", riveConfig: { nativeSound: false }, expected: false },
  { preference: false, pathname: "/preview", riveConfig: { nativeSound: true }, expected: true },
])("native sound follows the active scene policy or the current preference: %j", (options) => {
  expect(deriveNativeSound({ ...options, playing: true })).toBe(options.expected);
});

test.each([
  { preference: true, riveConfig: { nativeSound: false }, expected: true },
  { preference: false, riveConfig: { nativeSound: true }, expected: false },
])("paused or completed scenes release their native sound policy: %j", (options) => {
  expect(deriveNativeSound({ ...options, pathname: "/preview", playing: false })).toBe(
    options.expected,
  );
});

test("leaving the configured scene restores the latest preference without changing it", () => {
  const riveConfig = { nativeSound: false };
  const sound = (pathname: string, preference: boolean) =>
    deriveNativeSound({ pathname, preference, riveConfig, playing: true });
  expect([
    sound("/presets", true),
    sound("/preview", true),
    sound("/filtersModal", true),
    sound("/filtersModal", false),
    sound("/preview", false),
    sound("/demos", false),
    sound("/presets", true),
  ]).toEqual([true, false, true, false, false, false, true]);
});
