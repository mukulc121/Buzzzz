import { expect, test } from "bun:test";
import { playbackCommand } from "../src/features/playback/playbackCommand";

test("remote resume can play only on the active preview tab", () => {
  expect(playbackCommand({ paused: false, active: true })).toBe("play");
  expect(playbackCommand({ paused: true, active: true })).toBe("pause");
  expect(playbackCommand({ paused: false, active: false })).toBe("pause");
  expect(playbackCommand({ paused: true, active: false })).toBe("pause");
});
