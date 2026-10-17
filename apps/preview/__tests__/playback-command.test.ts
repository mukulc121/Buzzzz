import { expect, test } from "bun:test";
import { playbackCommand } from "../src/features/playback/playbackCommand";

test("remote resume can play only on the active preview tab", () => {
  for (const foreground of [false, true]) {
    expect(playbackCommand({ paused: false, active: true, foreground })).toBe(
      foreground ? "play" : "pause",
    );
    expect(playbackCommand({ paused: true, active: true, foreground })).toBe("pause");
    expect(playbackCommand({ paused: false, active: false, foreground })).toBe("pause");
    expect(playbackCommand({ paused: true, active: false, foreground })).toBe("pause");
  }
});
