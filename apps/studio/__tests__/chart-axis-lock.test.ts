import { expect, test } from "bun:test";
import { constrainDragAxis } from "../src/features/composer/dragAxis";

test("published Shift drag chooses the dominant screen axis, with horizontal ties", () => {
  const origin = { x: 100, y: 100 };
  const cases = [
    { position: { x: 110, y: 105 }, expected: { x: 110, y: 100, lockedAxis: "y" } },
    { position: { x: 105, y: 110 }, expected: { x: 100, y: 110, lockedAxis: "x" } },
    { position: { x: 90, y: 105 }, expected: { x: 90, y: 100, lockedAxis: "y" } },
    { position: { x: 105, y: 90 }, expected: { x: 100, y: 90, lockedAxis: "x" } },
    { position: { x: 110, y: 90 }, expected: { x: 110, y: 100, lockedAxis: "y" } },
    { position: { x: 90, y: 110 }, expected: { x: 90, y: 100, lockedAxis: "y" } },
    { position: { x: 100, y: 100 }, expected: { ...origin, lockedAxis: "y" } },
  ] satisfies {
    position: { x: number; y: number };
    expected: ReturnType<typeof constrainDragAxis>;
  }[];
  for (const { position, expected } of cases) {
    expect(constrainDragAxis({ origin, position, shift: true })).toEqual(expected);
    expect(constrainDragAxis({ origin, position, shift: false })).toEqual({
      ...position,
      lockedAxis: null,
    });
  }
});

test("Shift is recalculated from the original grab on every move and released immediately", () => {
  const origin = { x: 200, y: 150 };
  expect(constrainDragAxis({ origin, position: { x: 260, y: 120 }, shift: false })).toEqual({
    x: 260,
    y: 120,
    lockedAxis: null,
  });
  expect(constrainDragAxis({ origin, position: { x: 260, y: 120 }, shift: true })).toEqual({
    x: 260,
    y: 150,
    lockedAxis: "y",
  });
  expect(constrainDragAxis({ origin, position: { x: 220, y: 80 }, shift: true })).toEqual({
    x: 200,
    y: 80,
    lockedAxis: "x",
  });
  expect(constrainDragAxis({ origin, position: { x: 220, y: 80 }, shift: false })).toEqual({
    x: 220,
    y: 80,
    lockedAxis: null,
  });
});
