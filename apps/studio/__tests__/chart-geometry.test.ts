import { expect, test } from "bun:test";
import { chartGeometry } from "../src/features/composer/geometry";

test("Pulsar plot margins and inset time axis agree with pointer coordinates after resize", () => {
  const chart = chartGeometry({ width: 800, height: 320, startMs: 0, durationMs: 1000 });
  expect([chart.left, chart.top, chart.right, chart.bottom]).toEqual([46, 18, 782, 290]);
  expect([chart.x(0), chart.x(1000)]).toEqual([60, 768]);
  for (const width of [240, 800, 1600]) {
    const geometry = chartGeometry({ width, height: 500, startMs: 250, durationMs: 2200 });
    for (const fraction of [0, 0.1, 0.5, 1]) {
      const time = 250 + fraction * 2200;
      expect(geometry.timeAtX(geometry.x(time))).toBeCloseTo(time, 8);
      expect(geometry.valueAtY(geometry.y(fraction))).toBeCloseTo(fraction, 8);
      expect(geometry.containsPlot(geometry.x(time), geometry.y(fraction))).toBe(true);
    }
    expect(geometry.containsPlot(geometry.left - 1, geometry.top)).toBe(false);
  }
});
