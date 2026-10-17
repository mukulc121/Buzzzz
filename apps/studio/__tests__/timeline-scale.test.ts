import { expect, test } from "bun:test";
import {
  fitTimelineView,
  timelineScrollbar,
  timelineStartForThumb,
  zoomTimelineView,
} from "../src/features/composer/timelineScaleGeometry";

test("timeline zoom keeps its anchor and clamps its own window", () => {
  const view = { startMs: 1000, durationMs: 2000 };
  expect(zoomTimelineView(view, 4000, 0.5, 0.25)).toEqual({ startMs: 1250, durationMs: 1000 });
  expect(zoomTimelineView(view, 4000, 10, 0.5)).toEqual({ startMs: 0, durationMs: 4000 });
  expect(fitTimelineView({ startMs: 5000, durationMs: 1 }, 4000)).toEqual({
    startMs: 3980,
    durationMs: 20,
  });
});

test("scrollbar tracks the window and maps thumb travel to bounded time", () => {
  expect(timelineScrollbar({ startMs: 0, durationMs: 4000 }, 4000, 400)).toBeNull();
  expect(timelineScrollbar({ startMs: 0, durationMs: 2000 }, 4000, 0)).toBeNull();
  const scrollbar = timelineScrollbar({ startMs: 1000, durationMs: 2000 }, 4000, 400);
  if (!scrollbar) throw new Error("Expected a zoomed timeline scrollbar");
  expect(scrollbar).toEqual({ thumbWidth: 200, thumbLeft: 100, travel: 200, maxStart: 2000 });
  expect(timelineStartForThumb(100, scrollbar)).toBe(1000);
  expect(timelineStartForThumb(-100, scrollbar)).toBe(0);
  expect(timelineStartForThumb(900, scrollbar)).toBe(2000);
});

test("minimum 12px thumb still reaches the exact end of a heavily zoomed timeline", () => {
  const scrollbar = timelineScrollbar({ startMs: 3980, durationMs: 20 }, 4000, 320);
  if (!scrollbar) throw new Error("Expected a zoomed timeline scrollbar");
  expect(scrollbar).toEqual({ thumbWidth: 12, thumbLeft: 308, travel: 308, maxStart: 3980 });
  expect(timelineStartForThumb(154, scrollbar)).toBe(1990);
  expect(timelineStartForThumb(308, scrollbar)).toBe(3980);
});
