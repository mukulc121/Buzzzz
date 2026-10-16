import { expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import source from "./fixtures/published-demos.json";
import {
  BALLOON_PROFILES,
  BALLOON_RELEASE_MS,
  BALLOON_LONG_PRESS_MS,
  BALLOON_FADE_MS,
  BALLOON_RESET_MS,
  balloonFeedback,
  balloonImpulse,
} from "../src/features/demos/balloon/balloon";
import {
  DOT_PATTERNS,
  DOT_CYCLE_MS,
  DOT_STAGGER_MS,
  firstDotImpact,
} from "../src/features/demos/timers/dots";
import {
  NOTIFICATIONS,
  NOTIFICATION_STEP_MS,
  notificationAt,
} from "../src/features/demos/notifications/notifications";

test("balloon profiles and timing match the published IPA and APK modules", () => {
  expect(BALLOON_PROFILES).toEqual(source.provenance.balloon.profiles);
  expect([BALLOON_LONG_PRESS_MS, BALLOON_RELEASE_MS, BALLOON_FADE_MS, BALLOON_RESET_MS]).toEqual([
    source.provenance.balloon.longPressMs,
    source.provenance.balloon.releaseMs,
    source.provenance.balloon.fadeMs,
    source.provenance.balloon.resetMs,
  ]);
});

for (const [index, fixture] of source.progressCases.entries()) {
  test(`published balloon progress worklet case ${index}`, () => {
    const actual = balloonFeedback(
      fixture.current,
      fixture.previous,
      fixture.active,
      BALLOON_PROFILES[fixture.index],
    );
    expect(actual).toHaveLength(fixture.calls.length);
    for (const [position, command] of actual.entries()) {
      const expected = fixture.calls[position];
      expect(expected.kind).toBe(command.kind);
      if ("amplitude" in command) {
        if (typeof expected.amplitude !== "number" || typeof expected.frequency !== "number")
          throw new Error("Published haptic fixture is missing its amplitude or frequency");
        expect(command.amplitude).toBeCloseTo(expected.amplitude, 12);
        expect(command.frequency).toBeCloseTo(expected.frequency, 12);
      }
    }
  });
}

for (const [index, fixture] of source.shakeCases.entries()) {
  test(`published balloon shake worklet case ${index}`, () => {
    const actual = balloonImpulse(
      fixture.progress,
      fixture.previous,
      fixture.current,
      BALLOON_PROFILES[fixture.index],
    );
    expect(fixture.calls).toHaveLength(actual ? 1 : 0);
    if (actual) {
      expect(actual.amplitude).toBeCloseTo(fixture.calls[0].amplitude, 12);
      expect(actual.frequency).toBeCloseTo(fixture.calls[0].frequency, 12);
    }
  });
}

test("dot loader pulses retain exact source units, phases and distinct patterns", () => {
  expect(DOT_PATTERNS).toEqual(source.provenance.dots.patterns);
  expect(DOT_CYCLE_MS).toBe(source.provenance.dots.cycleMs);
  expect(DOT_STAGGER_MS).toBe(source.provenance.dots.staggerMs);
  expect([0, 1, 2].map(firstDotImpact)).toEqual([315, 535, 755]);
  expect([0, 1, 2].map((index) => firstDotImpact(index) + DOT_CYCLE_MS)).toEqual([
    1815, 2035, 2255,
  ]);
  for (const pattern of DOT_PATTERNS) expect(isPattern(pattern)).toBe(true);
});

test("notification messages, original glyphs, colors and preset adapters match both apps", () => {
  expect(source.provenance.notifications.notifications).toEqual(NOTIFICATIONS);
  expect(NOTIFICATION_STEP_MS).toBe(source.provenance.notifications.stepMs);
  expect(
    [-1, 0, 999, 1000, 1999, 2000, 3000, 4000, 4999, 5000].map(
      (time) => notificationAt(time)?.id ?? null,
    ),
  ).toEqual([
    null,
    "success",
    "success",
    "alert",
    "alert",
    "message",
    "error",
    "reminder",
    "reminder",
    null,
  ]);
});
