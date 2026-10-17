import { expect, test } from "bun:test";
import { parseAnimationData } from "../src/features/animation/document";
import { parseChannel, sampleChannel } from "../src/features/animation/channels";
import { analyzeAnimation } from "../src/features/animation/analysis";
import { analyzeAnimationAsync } from "../src/features/animation/analysisAsync";
import { sampleTransforms } from "../src/features/animation/transforms";
import { generateAnimationCandidates } from "../src/features/animation/generation";
import { isPattern } from "@buzzzz/core";

const ball = (position: unknown) => ({
  ty: 4,
  ind: 1,
  ip: 0,
  op: 120,
  ks: { p: position },
  shapes: [{ ty: "el", p: { k: [0, 0] }, s: { k: [20, 20] } }],
});
const composition = (layers: unknown[], op = 120) => ({
  v: "5.12.2",
  fr: 60,
  ip: 0,
  op,
  w: 200,
  h: 200,
  layers,
});
const bounce = () =>
  composition([
    ball({
      a: 1,
      k: [
        { t: 0, s: [0, 0] },
        { t: 30, s: [100, 0] },
        { t: 60, s: [0, 0] },
        { t: 90, s: [100, 0] },
        { t: 120, s: [0, 0] },
      ],
    }),
  ]);

test("Lottie channels handle static, linear, hold, temporal easing and spatial tangents", () => {
  expect(sampleChannel(parseChannel({ k: [10, 20] }, [0, 0]), 100)).toEqual([10, 20]);
  const linear = parseChannel(
    {
      a: 1,
      k: [
        { t: 0, s: [0] },
        { t: 60, s: [100] },
      ],
    },
    [0],
  );
  expect(sampleChannel(linear, 15)).toEqual([25]);
  const hold = parseChannel(
    {
      a: 1,
      k: [
        { t: 0, s: [10], h: 1 },
        { t: 60, s: [100] },
      ],
    },
    [0],
  );
  expect(sampleChannel(hold, 59)).toEqual([10]);
  expect(sampleChannel(hold, 60)).toEqual([100]);
  const eased = parseChannel(
    {
      a: 1,
      k: [
        { t: 0, s: [0], o: { x: 0.4, y: 0 } },
        { t: 60, s: [100], i: { x: 0.6, y: 1 } },
      ],
    },
    [0],
  );
  expect(sampleChannel(eased, 15)[0]).toBeLessThan(25);
  const curved = parseChannel(
    {
      a: 1,
      k: [
        { t: 0, s: [0, 0], to: [0, 100] },
        { t: 60, s: [100, 0], ti: [0, 100] },
      ],
    },
    [0, 0],
  );
  expect(sampleChannel(curved, 30)[1]).toBeCloseTo(75, 4);
});

test("parent transforms and stretched precomposition timelines affect sampled geometry", () => {
  const parented = parseAnimationData(
    composition([
      { ty: 3, ind: 1, ks: { p: { k: [10, 20] }, s: { k: [200, 200] } } },
      { ...ball({ k: [5, 5] }), ind: 2, parent: 1 },
    ]),
  );
  const shape = sampleTransforms(parented, 0).find((node) => node.visible);
  expect(shape?.x).toBe(20);
  expect(shape?.y).toBe(30);
  const nested = parseAnimationData({
    ...composition([{ ty: 0, refId: "nested", sr: 2, st: 0, ks: {} }]),
    assets: [
      {
        id: "nested",
        layers: [
          ball({
            a: 1,
            k: [
              { t: 0, s: [0, 0] },
              { t: 60, s: [100, 0] },
            ],
          }),
        ],
      },
    ],
  });
  expect(sampleTransforms(nested, 30).find((node) => node.visible)?.x).toBe(25);
});

test("motion analysis finds bounce reversals and five valid, distinct candidates", () => {
  const analysis = analyzeAnimation(parseAnimationData(bounce()));
  expect(analysis.frames).toHaveLength(481);
  expect(analysis.frameMs).toBeCloseTo(1000 / 240, 5);
  for (const time of [500, 1000, 1500])
    expect(analysis.impacts.some((impact) => Math.abs(impact.timeMs - time) <= 13)).toBe(true);
  expect(analysis.frames.every((frame) => Object.values(frame).every(Number.isFinite))).toBe(true);
  const candidates = generateAnimationCandidates(analysis);
  expect(candidates).toHaveLength(5);
  expect(new Set(candidates.map((candidate) => JSON.stringify(candidate.pattern))).size).toBe(5);
  for (const candidate of candidates) {
    expect(isPattern(candidate.pattern)).toBe(true);
    expect(
      candidate.pattern.discretePattern.every((tap) => tap.time >= 0 && tap.time <= 2000),
    ).toBe(true);
  }
  expect(candidates.find((candidate) => candidate.id === "impulse")?.description).toContain(
    "layer area as a mass proxy",
  );
});

test("static geometry produces no haptics and unsupported motion features are disclosed", () => {
  const document = parseAnimationData(
    composition([{ ...ball({ k: [50, 50, 100] }), ddd: 1, masksProperties: [] }]),
  );
  expect(document.warnings.join(" ")).toContain("3D");
  expect(document.warnings.join(" ")).toContain("Masks");
  for (const candidate of generateAnimationCandidates(analyzeAnimation(document))) {
    expect(candidate.pattern.continuousPattern.amplitude.every((point) => point.value === 0)).toBe(
      true,
    );
    expect(candidate.eventCount).toBe(0);
  }
});

test("validation rejects malformed geometry, expressions and parent/precomposition cycles", () => {
  expect(() => parseAnimationData({})).toThrow("layers");
  expect(() => parseAnimationData({ ...bounce(), fr: 0 })).toThrow("frame rate");
  expect(() =>
    parseAnimationData(composition([{ ...ball({ k: [0, 0], x: "time * 100" }) }])),
  ).toThrow("expressions");
  expect(() => parseAnimationData(composition([{ ...ball({ k: [0, 0] }), parent: 1 }]))).toThrow(
    "cycle",
  );
  expect(() =>
    parseAnimationData({
      ...composition([{ ty: 0, refId: "loop" }]),
      assets: [{ id: "loop", layers: [{ ty: 0, refId: "loop" }] }],
    }),
  ).toThrow("cycle");
});

test("worker equals synchronous analysis and cancellation is observable", async () => {
  const document = parseAnimationData(bounce());
  expect(await analyzeAnimationAsync(document, 10)).toEqual(analyzeAnimation(document, 10));
  const controller = new AbortController();
  controller.abort();
  await expect(analyzeAnimationAsync(document, 10, controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
});

test("long animations and high-rate samples stay within pattern limits", () => {
  const document = parseAnimationData({ ...bounce(), op: 6000 });
  const analysis = analyzeAnimation(document, 2);
  expect(analysis.durationMs).toBe(60000);
  expect(analysis.frames).toHaveLength(30001);
  for (const candidate of generateAnimationCandidates(analysis))
    expect(isPattern(candidate.pattern)).toBe(true);
});

test("Hybrid gain, threshold, gap, frequency follow and millisecond smoothing change output", () => {
  const source = analyzeAnimation(parseAnimationData(bounce()));
  const analysis = {
    ...source,
    frames: source.frames.map((frame) => ({
      ...frame,
      transient:
        frame.timeMs === 100
          ? 0.1
          : Math.abs(frame.timeMs - 129.1667) < 0.01
            ? 0.3
            : Math.abs(frame.timeMs - 500) < 0.01
              ? 0.6
              : 0,
    })),
  };
  const options = {
    smoothingMs: 12,
    strategyParams: { hybrid: { gain: 1.2, threshold: 0.05, minGapMs: 20, freqFollow: 0.7 } },
  } satisfies Parameters<typeof generateAnimationCandidates>[1];
  const normal = generateAnimationCandidates(analysis, options)[0];
  const soft = generateAnimationCandidates(analysis, {
    ...options,
    strategyParams: { hybrid: { ...options.strategyParams.hybrid, gain: 0.5 } },
  })[0];
  expect(
    Math.max(...soft.pattern.continuousPattern.amplitude.map((point) => point.value)),
  ).toBeLessThan(
    Math.max(...normal.pattern.continuousPattern.amplitude.map((point) => point.value)),
  );
  expect(normal.eventCount).toBe(3);
  expect(
    generateAnimationCandidates(analysis, {
      ...options,
      strategyParams: { hybrid: { ...options.strategyParams.hybrid, threshold: 0.5 } },
    })[0].eventCount,
  ).toBe(1);
  expect(
    generateAnimationCandidates(analysis, {
      ...options,
      strategyParams: { hybrid: { ...options.strategyParams.hybrid, minGapMs: 100 } },
    })[0].eventCount,
  ).toBe(2);
  expect(
    generateAnimationCandidates(analysis, {
      ...options,
      strategyParams: { hybrid: { ...options.strategyParams.hybrid, freqFollow: 0 } },
    })[0].pattern.continuousPattern.frequency[0].value,
  ).toBe(0.35);
  expect(
    generateAnimationCandidates(
      analyzeAnimation(parseAnimationData(bounce()), source.frameMs, 120),
      options,
    )[0].pattern,
  ).not.toEqual(normal.pattern);
});
