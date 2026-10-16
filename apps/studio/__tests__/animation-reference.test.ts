import { expect, test } from "bun:test";
import reference from "./fixtures/animation-reference.json";
import { parseAnimationData } from "../src/features/animation/document";
import { analyzeAnimation } from "../src/features/animation/analysis";
import { generateAnimationCandidates } from "../src/features/animation/generation";
import { isPattern } from "@buzzzz/core";

for (const scenario of reference.scenarios)
  test(`deployed Pulsar animation worker: ${scenario.name}`, () => {
    const analysis = analyzeAnimation(
      parseAnimationData(scenario.source),
      1000 / scenario.options.sampleFps,
      scenario.options.smoothingMs,
    );
    const candidates = generateAnimationCandidates(analysis, {
      ...scenario.options,
      strategyParams: scenario.strategyParams,
    });
    expect(candidates).toHaveLength(5);
    for (const candidate of candidates) {
      expect(candidate.pattern).toEqual(scenario.expected[candidate.id]);
      expect(isPattern(candidate.pattern)).toBe(true);
    }
  });
