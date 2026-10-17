import { expect, test } from "bun:test";
import { playbackStart } from "../src/features/composer/playbackStart";

test("Play uses only a scrub cursor strictly inside its range", () => {
  const range = { start: 25, end: 150 };
  expect([-20, 0, 25, 75, 150, 200].map((cursor) => playbackStart(range, cursor))).toEqual([
    25, 25, 25, 75, 25, 25,
  ]);
});
