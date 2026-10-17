import { patternEnd } from "@buzzzz/core";
import { analyzeAnimationAsync } from "../animation/analysisAsync";
import { generateAnimationCandidates } from "../animation/generation";
import type { AnimationMetric, IAnimationAnalysis } from "../animation/model";
import { animationStrategyControls } from "../animation/strategyControls";
import type { EditorRequest } from "./commands";
import {
  choose,
  CommandError,
  numericOptions,
  rejectUnknown,
  requireWriter,
  summarize,
  throwIfAborted,
} from "./guards";
import type { ICommandContext, IEditorTarget } from "./target";

type TAnalyze = Extract<EditorRequest, { command: "animation_analyze" }>;
type TGenerate = Extract<EditorRequest, { command: "audio_generate" | "animation_generate" }>;

const METRICS = [
  "energy",
  "acceleration",
  "transient",
  "positionRate",
  "scaleRate",
  "rotationRate",
  "opacityRate",
] as const satisfies readonly AnimationMetric[];
const GENERATION_KEYS = [
  "smoothingMs",
  "contrast",
  "gamma",
  "silenceFloor",
  "transientDuck",
  "envelopeHz",
  "maxPoints",
  "maxEvents",
] as const;
const generationBounds = {
  smoothingMs: [0, 40],
  contrast: [0, 1],
  gamma: [0.3, 1],
  silenceFloor: [0, 0.2],
  transientDuck: [0, 0.6],
  envelopeHz: [20, 200],
  maxPoints: [2, 10000],
  maxEvents: [0, 10000],
};
const approaches = [
  { id: "hybrid" },
  { id: "energy" },
  { id: "kinematic" },
  { id: "impulse" },
  { id: "channel" },
] as const;

function readySource(target: IEditorTarget) {
  if (target.media.pending.animation || target.animation.loading)
    throw new CommandError("The animation is still loading. Retry when it is ready");
  if (!target.animation.source)
    throw new CommandError("No animation is attached. Call media_attach first");
  return target.animation.source;
}

async function analyze(context: ICommandContext, frameMs: number, smoothingMs = 12) {
  const source = readySource(context.read());
  const analysis = await analyzeAnimationAsync(
    source.document,
    frameMs,
    context.signal,
    smoothingMs,
  );
  throwIfAborted(context.signal);
  if (context.read().animation.source !== source)
    throw new CommandError("The animation changed during analysis. Retry");
  return { source, analysis };
}

function report(name: string, analysis: IAnimationAnalysis, smoothingMs: number) {
  return {
    file: name,
    durationMs: analysis.durationMs,
    frameMs: analysis.frameMs,
    frames: analysis.frames.length,
    smoothingMs,
    impacts: analysis.impacts.slice(0, 512),
    warnings: analysis.warnings,
    metrics: Object.fromEntries(
      METRICS.map((metric) => [metric, summarize(analysis.frames.map((frame) => frame[metric]))]),
    ),
  };
}

export async function animationAnalyze(request: TAnalyze, context: ICommandContext) {
  const frameMs = request.sampleHz ? 1000 / request.sampleHz : context.read().animation.frameMs;
  const smoothingMs = request.smoothingMs ?? context.read().animation.generationOptions.smoothingMs;
  const { source, analysis } = await analyze(context, frameMs, smoothingMs);
  return report(source.file.name, analysis, smoothingMs);
}

export async function animationGenerate(request: TGenerate, context: ICommandContext) {
  const target = context.read();
  requireWriter(target);
  const source = readySource(target);
  const approach = choose(request.approach, approaches, "animation approach");
  const controls = animationStrategyControls[approach];
  const keys = [...GENERATION_KEYS, ...controls.map((control) => control.id)];
  rejectUnknown(request.options, keys);
  const numbers = numericOptions(request.options, keys);
  for (const key of GENERATION_KEYS) {
    const value = numbers[key];
    if (value === undefined) continue;
    const [min, max] = generationBounds[key];
    if (
      value < min ||
      value > max ||
      ((key === "maxPoints" || key === "maxEvents") && !Number.isInteger(value))
    )
      throw new CommandError(`options.${key} must be ${min} to ${max}`);
  }
  const params: Record<string, number> = {};
  for (const control of controls) {
    const value = numbers[control.id];
    if (value === undefined) continue;
    if (value < control.min || value > control.max)
      throw new CommandError(`options.${control.id} must be ${control.min} to ${control.max}`);
    params[control.id] = value;
  }
  const smoothingMs = numbers.smoothingMs ?? target.animation.generationOptions.smoothingMs;
  const analysis =
    (smoothingMs === target.animation.generationOptions.smoothingMs
      ? target.animation.analysis
      : null) ?? (await analyze(context, target.animation.frameMs, smoothingMs)).analysis;
  const latest = context.read();
  requireWriter(latest);
  if (latest.animation.source !== source) throw new CommandError("The animation changed. Retry");
  const { animation } = latest;
  const candidates = generateAnimationCandidates(analysis, {
    ...animation.generationOptions,
    ...numbers,
    smoothingMs,
    strategyParams: {
      ...animation.strategyParams,
      hybrid: animation.hybrid,
      [approach]: {
        ...(approach === "hybrid" ? animation.hybrid : animation.strategyParams[approach]),
        ...params,
      },
    },
  });
  const candidate = candidates.find((item) => item.id === approach);
  if (!candidate) throw new CommandError(`Animation approach "${approach}" is unavailable`);
  if (request.action === "add") latest.preserve(candidate.pattern, candidate.label);
  else latest.applyGenerated(candidate.pattern);
  return {
    action: request.action,
    approach: candidate.id,
    label: candidate.label,
    approximate: candidate.approximate,
    pointCount: candidate.pointCount,
    eventCount: candidate.eventCount,
    durationMs: patternEnd(candidate.pattern),
  };
}
