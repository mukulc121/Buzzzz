import { expect, test } from "bun:test";
import {
  chartDuration,
  chartWheelViewport,
  clampChartViewport,
} from "../src/features/composer/chartNavigation";

const navigation = {
  viewport: { startMs: 1000, durationMs: 2000 },
  durationMs: 5000,
  axisLeft: 60,
  axisWidth: 700,
  pointerX: 235,
};
const wheel = { deltaX: 0, deltaY: 70, metaKey: false, ctrlKey: false };

test("chart wheel pans by the dominant raw delta regardless of its magnitude", () => {
  expect(chartWheelViewport({ ...navigation, event: wheel })).toEqual({
    startMs: 1200,
    durationMs: 2000,
  });
  expect(chartWheelViewport({ ...navigation, event: { ...wheel, deltaX: -140 } })).toEqual({
    startMs: 600,
    durationMs: 2000,
  });
  expect(chartWheelViewport({ ...navigation, event: { ...wheel, deltaX: -70 } })).toEqual({
    startMs: 1200,
    durationMs: 2000,
  });
});

test("either platform modifier zooms by 1.15 at the pointer without magnitude scaling", () => {
  for (const modifier of ["metaKey", "ctrlKey"]) {
    for (const deltaY of [-1, -500]) {
      const next = chartWheelViewport({
        ...navigation,
        event: { ...wheel, [modifier]: true, deltaY },
      });
      expect(next.durationMs).toBeCloseTo(2000 / 1.15, 8);
      expect(next.startMs + next.durationMs * 0.25).toBeCloseTo(1500, 8);
    }
  }
  expect(
    chartWheelViewport({ ...navigation, event: { ...wheel, ctrlKey: true } }).durationMs,
  ).toBeCloseTo(2300, 8);
});

test("chart bounds retain the source 20 ms minimum and 80 percent trailing overscroll", () => {
  expect(clampChartViewport({ startMs: -30, durationMs: 1 }, 5000)).toEqual({
    startMs: 0,
    durationMs: 20,
  });
  expect(clampChartViewport({ startMs: 99999, durationMs: 2000 }, 5000)).toEqual({
    startMs: 4600,
    durationMs: 2000,
  });
  expect(clampChartViewport({ startMs: 99999, durationMs: 9000 }, 5000)).toEqual({
    startMs: 4000,
    durationMs: 5000,
  });
  const next = chartWheelViewport({
    ...navigation,
    pointerX: 46,
    event: { ...wheel, ctrlKey: true, deltaY: -1 },
  });
  expect(next.startMs).toBeCloseTo(1000 - (14 / 700) * (2000 - 2000 / 1.15), 8);
});

test("chart extent includes attached media and rounds the full preset duration upward", () => {
  const pattern = {
    discretePattern: [],
    continuousPattern: { amplitude: [{ time: 700, value: 0.5 }], frequency: [] },
  };
  expect(chartDuration({ pattern })).toBe(700);
  expect(chartDuration({ pattern, markerDurationMs: 2500.25 })).toBe(2501);
  expect(
    chartDuration({
      pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
    }),
  ).toBe(100);
});
