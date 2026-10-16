import { patternEnd } from "@buzzzz/core";
import { analyzeAnimationAsync } from "../animation/analysisAsync";
import { generateAnimationCandidates } from "../animation/generation";
import type { AnimationMetric, IAnimationAnalysis } from "../animation/model";
import type { EditorRequest } from "./commands";
import {
  AUDIO_OPTION_KEYS,
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
  "velocity",
  "acceleration",
  "directionChange",
  "impulse",
  "positionX",
  "positionY",
  "scale",
  "rotation",
  "opacity",
] as const satisfies readonly AnimationMetric[];
const NUMERIC_KEYS = [...AUDIO_OPTION_KEYS, "gain", "threshold", "minGapMs", "freqFollow"] as const;
const CHANNEL_KEYS = ["intensityChannel", "frequencyChannel"] as const;

function readySource(target: IEditorTarget) {
  if (target.media.pending.animation || target.animation.loading)
    throw new CommandError("The animation is still loading. Retry when it is ready");
  if (!target.animation.source)
    throw new CommandError("No animation is attached. Call media_attach first");
  return target.animation.source;
}

function channel(value: unknown, key: string): AnimationMetric | undefined {
  if (value === undefined) return undefined;
  const found = METRICS.find((item) => item === value);
  if (!found) throw new CommandError(`options.${key} must be one of ${METRICS.join(", ")}`);
  return found;
}

function smooth(values: number[], width: number): number[] {
  if (width <= 1) return values;
  let sum = 0;
  return values.map((value, index) => {
    sum += value - (index >= width ? values[index - width] : 0);
    return sum / Math.min(index + 1, width);
  });
}

async function analyze(context: ICommandContext, frameMs: number) {
  const source = readySource(context.read());
  const analysis = await analyzeAnimationAsync(source.document, frameMs, context.signal);
  throwIfAborted(context.signal);
  if (context.read().animation.source !== source)
    throw new CommandError("The animation changed during analysis. Retry");
  return { source, analysis };
}

function report(name: string, analysis: IAnimationAnalysis, smoothingMs: number) {
  const width = Math.round(smoothingMs / analysis.frameMs);
  return {
    file: name,
    durationMs: analysis.durationMs,
    frameMs: analysis.frameMs,
    frames: analysis.frames.length,
    smoothingMs,
    impacts: analysis.impacts.slice(0, 512),
    warnings: analysis.warnings,
    metrics: Object.fromEntries(
      METRICS.map((metric) => [
        metric,
        summarize(
          smooth(
            analysis.frames.map((frame) => frame[metric]),
            width,
          ),
        ),
      ]),
    ),
  };
}

export async function animationAnalyze(request: TAnalyze, context: ICommandContext) {
  const frameMs = request.sampleHz ? 1000 / request.sampleHz : context.read().animation.frameMs;
  const { source, analysis } = await analyze(context, frameMs);
  return report(source.file.name, analysis, request.smoothingMs ?? 0);
}

export async function animationGenerate(request: TGenerate, context: ICommandContext) {
  const target = context.read();
  requireWriter(target);
  const source = readySource(target);
  rejectUnknown(request.options, [...NUMERIC_KEYS, ...CHANNEL_KEYS]);
  const numbers = numericOptions(request.options, NUMERIC_KEYS);
  const intensityChannel = channel(request.options.intensityChannel, "intensityChannel");
  const frequencyChannel = channel(request.options.frequencyChannel, "frequencyChannel");
  const analysis =
    target.animation.analysis ?? (await analyze(context, target.animation.frameMs)).analysis;
  const latest = context.read();
  requireWriter(latest);
  if (latest.animation.source !== source) throw new CommandError("The animation changed. Retry");
  const { animation } = latest;
  const candidates = generateAnimationCandidates(analysis, {
    ...animation.generationOptions,
    ...animation.hybrid,
    ...numbers,
    smoothingMs: numbers.smoothingMs ?? animation.generationOptions.smoothingMs,
    intensityChannel: intensityChannel ?? animation.intensityChannel,
    frequencyChannel: frequencyChannel ?? animation.frequencyChannel,
  });
  const approach = choose(request.approach, candidates, "animation approach");
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
