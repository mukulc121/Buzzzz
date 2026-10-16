import { patternEnd } from "@buzzzz/core";
import { AUDIO_ANALYSES, analyzeAudioAsync } from "../audio/analysis";
import { AUDIO_APPROACHES, generateAudioCandidates } from "../audio/generation";
import type { AudioMetric, IAudioAnalysis } from "../audio/model";
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

type TAnalyze = Extract<EditorRequest, { command: "audio_analyze" }>;
type TGenerate = Extract<EditorRequest, { command: "audio_generate" | "animation_generate" }>;

function readySource(target: IEditorTarget) {
  if (target.media.pending.audio || target.audio.decoding)
    throw new CommandError("Audio is still loading. Retry when it is ready");
  if (!target.audio.source) throw new CommandError("No audio is attached. Call media_attach first");
  return target.audio.source;
}

function metricList(names: readonly string[] | undefined): AudioMetric[] {
  if (!names) return AUDIO_ANALYSES.map((item) => item.id);
  return names.map((name) => {
    const found = AUDIO_ANALYSES.find((item) => item.id === name);
    if (!found) throw new CommandError(`Unknown audio metric "${name}"`);
    return found.id;
  });
}

// Analyzes the source captured at call time and fails if it is replaced meanwhile.
async function analyze(
  context: ICommandContext,
  options: { frameMs: number; offsetMs: number; durationMs: number },
) {
  const source = readySource(context.read());
  const analysis = await analyzeAudioAsync(source.decoded, options, context.signal);
  throwIfAborted(context.signal);
  if (context.read().audio.source !== source)
    throw new CommandError("The audio changed during analysis. Retry");
  return { source, analysis };
}

function report(name: string, analysis: IAudioAnalysis, metrics: AudioMetric[]) {
  return {
    file: name,
    sourceDurationMs: analysis.sourceDurationMs,
    offsetMs: analysis.offsetMs,
    durationMs: analysis.durationMs,
    frameMs: analysis.frameMs,
    frames: analysis.frames.length,
    tempoBpm: analysis.tempoBpm,
    beatTimesMs: analysis.beatTimesMs.slice(0, 512),
    onsets: analysis.onsets.slice(0, 512),
    metrics: Object.fromEntries(
      metrics.map((metric) => [metric, summarize(analysis.frames.map((frame) => frame[metric]))]),
    ),
  };
}

export async function audioAnalyze(request: TAnalyze, context: ICommandContext) {
  const { audio } = context.read();
  const metrics = metricList(request.metrics);
  const { source, analysis } = await analyze(context, {
    frameMs: request.frameMs ?? audio.frameMs,
    offsetMs: request.offsetMs ?? audio.trim.startMs,
    durationMs: request.durationMs ?? audio.trim.endMs - audio.trim.startMs,
  });
  return report(source.file.name, analysis, metrics);
}

export async function audioGenerate(request: TGenerate, context: ICommandContext) {
  const target = context.read();
  requireWriter(target);
  const source = readySource(target);
  const approach = choose(request.approach, AUDIO_APPROACHES, "audio approach");
  rejectUnknown(request.options, AUDIO_OPTION_KEYS);
  const options = numericOptions(request.options, AUDIO_OPTION_KEYS);
  const { trim, frameMs } = target.audio;
  const analysis =
    target.audio.analysis ??
    (
      await analyze(context, {
        frameMs,
        offsetMs: trim.startMs,
        durationMs: trim.endMs - trim.startMs,
      })
    ).analysis;
  const latest = context.read();
  requireWriter(latest);
  if (latest.audio.source !== source) throw new CommandError("The audio changed. Retry");
  const candidate = generateAudioCandidates(analysis, {
    ...latest.audio.generationOptions,
    ...options,
  }).find((item) => item.id === approach);
  if (!candidate) throw new CommandError(`Audio approach "${approach}" is unavailable`);
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
