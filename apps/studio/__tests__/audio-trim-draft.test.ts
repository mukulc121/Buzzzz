import { expect, test } from "bun:test";
import { constrainTrimDraft } from "../src/features/audio/trimDraft";

test("trim drafts stay in the source and preserve a playable selection", () => {
  expect(constrainTrimDraft({ startMs: -1, endMs: 3000 }, 2000)).toEqual({
    startMs: 0,
    endMs: 2000,
  });
  expect(constrainTrimDraft({ startMs: 1800, endMs: 500 }, 2000)).toEqual({
    startMs: 1800,
    endMs: 1801,
  });
  expect(constrainTrimDraft({ startMs: 3000, endMs: 5000 }, 2000)).toEqual({
    startMs: 1999,
    endMs: 2000,
  });
  expect(constrainTrimDraft({ startMs: 100, endMs: 120000 }, 150000)).toEqual({
    startMs: 100,
    endMs: 60100,
  });
});
