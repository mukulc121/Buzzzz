import { patternEnd } from "@buzzzz/core";
import { generate } from "../audio/generation/client";
import type { IGenerationOptions } from "../audio/generation/model";
import { STRATEGIES } from "../audio/generation/strategies";
import { toPattern } from "../audio/generation/pattern";
import { AUDIO_METRICS, clampFrameMs, metricDefaults } from "../audio/metrics";
import { monoMix, trimChannels, trimWindow } from "../audio/signal/mix";
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

type TAnalyze = Extract<EditorRequest, { command: "audio_analyze" }>;
type TGenerate = Extract<EditorRequest, { command: "audio_generate" | "animation_generate" }>;

const GENERATION_KEYS = [
  "envelopeHz",
  "maxPoints",
  "maxEvents",
  "silenceFloor",
  "gamma",
  "transientDuck",
  "contrast",
] as const satisfies readonly (keyof IGenerationOptions)[];

function readySource(target: IEditorTarget) {
  if (target.media.pending.audio || target.audio.decoding)
    throw new CommandError("Audio is still loading. Retry when it is ready");
  if (!target.audio.source) throw new CommandError("No audio is attached. Call media_attach first");
  return target.audio.source;
}

function metricList(names: readonly string[] | undefined) {
  if (!names) return AUDIO_METRICS;
  return names.map((name) => {
    const found = AUDIO_METRICS.find((item) => item.id === name);
    if (!found)
      throw new CommandError(
        `Unknown audio metric "${name}". Use ${AUDIO_METRICS.map((item) => item.id).join(", ")}`,
      );
    return found;
  });
}

// Measures Pulsar's signal-analysis metrics with the Sound panel's current parameters.
export async function audioAnalyze(request: TAnalyze, context: ICommandContext) {
  const { audio } = context.read();
  const source = readySource(context.read());
  const metrics = metricList(request.metrics);
  const frameMs = clampFrameMs(request.frameMs ?? audio.metrics.frameMs);
  const offsetMs = Math.max(0, request.offsetMs ?? audio.trim.startMs);
  const durationMs = request.durationMs ?? audio.trim.endMs - audio.trim.startMs;
  const { decoded } = source;
  const samples = trimWindow(
    monoMix(decoded.channels),
    decoded.sampleRate,
    offsetMs,
    offsetMs + durationMs,
  );
  const series = metrics.map((metric) => {
    const result = metric.compute(samples, decoded.sampleRate, frameMs, {
      ...metricDefaults(metric),
      ...audio.metrics.params[metric.id],
    });
    return [metric.id, { stepMs: result.stepMs, ...summarize(Array.from(result.values)) }] as const;
  });
  throwIfAborted(context.signal);
  if (context.read().audio.source !== source)
    throw new CommandError("The audio changed during analysis. Retry");
  return {
    file: source.file.name,
    sourceDurationMs: decoded.durationMs,
    offsetMs,
    durationMs: (samples.length / decoded.sampleRate) * 1000,
    frameMs,
    metrics: Object.fromEntries(series),
  };
}

// Runs Pulsar's generation worker with the panel's settings plus any overrides.
export async function audioGenerate(request: TGenerate, context: ICommandContext) {
  const target = context.read();
  requireWriter(target);
  const source = readySource(target);
  const approach = choose(request.approach, STRATEGIES, "audio approach");
  const strategy = STRATEGIES.find((item) => item.id === approach)!;
  const paramKeys = strategy.params.map((param) => param.id);
  rejectUnknown(request.options, [...GENERATION_KEYS, ...paramKeys]);
  const overrides = numericOptions(request.options, [...GENERATION_KEYS, ...paramKeys]);
  const { trim, generation } = target.audio;
  const options = { ...generation.options };
  const params = { ...generation.strategyParams[approach] };
  for (const [key, value] of Object.entries(overrides))
    if (value !== undefined) {
      if ((GENERATION_KEYS as readonly string[]).includes(key))
        options[key as keyof IGenerationOptions] = value;
      else params[key] = value;
    }
  const { decoded } = source;
  const { results } = await generate(
    trimChannels(decoded.channels, decoded.sampleRate, trim.startMs, trim.endMs),
    decoded.sampleRate,
    options,
    { ...generation.strategyParams, [approach]: params },
  );
  throwIfAborted(context.signal);
  const latest = context.read();
  requireWriter(latest);
  if (latest.audio.source !== source) throw new CommandError("The audio changed. Retry");
  const result = results.find((item) => item.strategyId === approach);
  if (!result || result.error)
    throw new CommandError(result?.error ?? `Audio approach "${approach}" is unavailable`);
  const pattern = toPattern(result.pattern);
  if (request.action === "add") latest.preserve(pattern, result.name);
  else latest.applyGenerated(pattern);
  return {
    action: request.action,
    approach: result.strategyId,
    label: result.name,
    pointCount: result.pattern.intensity.length + result.pattern.frequency.length,
    eventCount: result.pattern.discrete.length,
    durationMs: patternEnd(pattern),
  };
}
