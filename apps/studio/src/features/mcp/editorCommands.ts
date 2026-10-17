import { patternEnd, type Pattern } from "@buzzzz/core";
import type { PointSelection } from "../composer/model";
import type { EditorRequest } from "./commands";
import { CommandError, requireWriter } from "./guards";
import type { IEditorTarget } from "./target";

type TRequest<T extends EditorRequest["command"]> = Extract<EditorRequest, { command: T }>;

const exists = (pattern: Pattern, point: PointSelection) =>
  point.layer === "discrete"
    ? point.index < pattern.discretePattern.length
    : point.index < pattern.continuousPattern[point.layer].length;

export function editorSelection(request: TRequest<"editor_selection">, target: IEditorTarget) {
  const { composer, document } = target;
  if (request.action === "get") return { points: composer.selection };
  if (request.action === "clear") {
    composer.setSelected(null);
    return { points: [] };
  }
  const missing = request.points.find((point) => !exists(document.pattern, point));
  if (missing)
    throw new CommandError(`The current pattern has no ${missing.layer} point ${missing.index}`);
  composer.setSelected(request.points[0] ?? null);
  composer.setSelection(request.points);
  return { points: request.points };
}

export function editorCursor(request: TRequest<"editor_cursor">, target: IEditorTarget) {
  const { playback, animation } = target;
  if (request.timeMs === undefined) return { timeMs: playback.playhead, playing: playback.playing };
  if (playback.playing) throw new CommandError("Stop playback before moving the cursor");
  playback.setPlayhead(request.timeMs);
  animation.setSeekMs(request.timeMs);
  return { timeMs: request.timeMs, playing: false };
}

export function editorRange(request: TRequest<"editor_range">, target: IEditorTarget) {
  const { composer, document } = target;
  const { startMs, endMs, enabled } = request;
  const read = (range: typeof composer.range) =>
    range ? { enabled: true, startMs: range.start, endMs: range.end } : { enabled: false };
  if (enabled === undefined && startMs === undefined && endMs === undefined)
    return read(composer.range);
  requireWriter(target);
  if (enabled === false) {
    composer.setRange(null);
    return read(null);
  }
  const start = startMs ?? composer.range?.start ?? 0;
  const end = endMs ?? composer.range?.end ?? patternEnd(document.pattern);
  if (end <= start) throw new CommandError("endMs must be greater than startMs");
  const range = { start, end };
  composer.setRange(range);
  return read(range);
}

export function editorHistory(request: TRequest<"editor_history">, target: IEditorTarget) {
  requireWriter(target);
  const { document } = target;
  const undo = request.action === "undo";
  if (!(undo ? document.canUndo : document.canRedo))
    throw new CommandError(`Nothing to ${request.action} in the selected pattern`);
  const applied = undo ? document.undo() : document.redo();
  if (!applied) throw new CommandError(`The editor could not ${request.action}`);
  return { action: request.action, applied };
}
