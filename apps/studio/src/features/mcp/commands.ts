import { isRecord, type EditorCommand } from "@buzzzz/core";
import type { PointSelection } from "../composer/model";
import { CommandError } from "./guards";

export type TMediaKind = "audio" | "animation";
export type TGenerateAction = "apply" | "add";
export type EditorRequest =
  | {
      command: "audio_analyze";
      frameMs?: number;
      offsetMs?: number;
      durationMs?: number;
      metrics?: string[];
    }
  | {
      command: "audio_generate" | "animation_generate";
      approach?: string;
      options: Record<string, unknown>;
      action: TGenerateAction;
    }
  | { command: "animation_analyze"; sampleHz?: number; smoothingMs?: number }
  | { command: "editor_selection"; action: "get" | "set" | "clear"; points: PointSelection[] }
  | { command: "editor_cursor"; timeMs?: number }
  | { command: "editor_range"; startMs?: number; endMs?: number; enabled?: boolean }
  | { command: "editor_history"; action: "undo" | "redo" }
  | { command: "media_attach"; kind: TMediaKind; assetUrl: string; filename: string }
  | { command: "media_detach"; kind: TMediaKind }
  | { command: "media_trim"; offsetMs: number; durationMs: number };

type TArgs = Record<string, unknown>;
const LAYERS = ["amplitude", "frequency", "discrete"] as const;
const KINDS = ["audio", "animation"] as const;

function only(args: TArgs, keys: readonly string[]): void {
  for (const key of Object.keys(args))
    if (!keys.includes(key)) throw new CommandError(`arguments.${key} is not supported`);
}
function num(args: TArgs, key: string, min: number, max: number, integer = false) {
  const value = args[key];
  if (value === undefined) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (integer && !Number.isSafeInteger(value)) ||
    value < min ||
    value > max
  )
    throw new CommandError(`arguments.${key} must be a number from ${min} to ${max}`);
  return value;
}
function need<T>(value: T | undefined, key: string): T {
  if (value === undefined) throw new CommandError(`arguments.${key} is required`);
  return value;
}
function text(args: TArgs, key: string, max = 512) {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length < 1 || value.length > max)
    throw new CommandError(`arguments.${key} must be a string of 1 to ${max} characters`);
  return value;
}
function pick<T extends string>(args: TArgs, key: string, values: readonly T[]): T | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  const found = values.find((item) => item === value);
  if (!found) throw new CommandError(`arguments.${key} must be one of ${values.join(", ")}`);
  return found;
}
function points(value: unknown): PointSelection[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10000)
    throw new CommandError("arguments.points must be an array of at most 10000 points");
  return value.map((item: unknown) => {
    if (!isRecord(item)) throw new CommandError("arguments.points items must be objects");
    only(item, ["layer", "index"]);
    return {
      layer: need(pick(item, "layer", LAYERS), "points.layer"),
      index: need(num(item, "index", 0, Number.MAX_SAFE_INTEGER, true), "points.index"),
    };
  });
}
function metrics(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20)
    throw new CommandError("arguments.metrics must be at most 20 metric names");
  return value.map((item: unknown) => {
    if (typeof item !== "string" || item.length < 1 || item.length > 512)
      throw new CommandError("arguments.metrics items must be metric names");
    return item;
  });
}
function generate(command: "audio_generate" | "animation_generate", args: TArgs): EditorRequest {
  only(args, ["approach", "options", "action"]);
  if (args.options !== undefined && !isRecord(args.options))
    throw new CommandError("arguments.options must be an object");
  return {
    command,
    approach: text(args, "approach"),
    options: isRecord(args.options) ? args.options : {},
    action: pick(args, "action", ["apply", "add"]) ?? "apply",
  };
}

// Mirrors the relay tool schemas so a malformed command fails before touching the editor.
export function parseCommand(command: EditorCommand, args: TArgs): EditorRequest {
  switch (command) {
    case "audio_analyze": {
      only(args, ["frameMs", "offsetMs", "durationMs", "metrics"]);
      return {
        command,
        frameMs: num(args, "frameMs", 2, 100),
        offsetMs: num(args, "offsetMs", 0, 86400000),
        durationMs: num(args, "durationMs", 1, 60000),
        metrics: metrics(args.metrics),
      };
    }
    case "audio_generate":
    case "animation_generate":
      return generate(command, args);
    case "animation_analyze":
      only(args, ["sampleHz", "smoothingMs"]);
      return {
        command,
        sampleHz: num(args, "sampleHz", 60, 480),
        smoothingMs: num(args, "smoothingMs", 0, 40),
      };
    case "editor_selection":
      only(args, ["action", "points"]);
      return {
        command,
        action: need(pick(args, "action", ["get", "set", "clear"]), "action"),
        points: points(args.points),
      };
    case "editor_cursor":
      only(args, ["timeMs"]);
      return { command, timeMs: num(args, "timeMs", 0, 60000) };
    case "editor_range": {
      only(args, ["startMs", "endMs", "enabled"]);
      if (args.enabled !== undefined && typeof args.enabled !== "boolean")
        throw new CommandError("arguments.enabled must be boolean");
      return {
        command,
        startMs: num(args, "startMs", 0, 60000),
        endMs: num(args, "endMs", 0, 60000),
        enabled: args.enabled,
      };
    }
    case "editor_history":
      only(args, ["action"]);
      return { command, action: need(pick(args, "action", ["undo", "redo"]), "action") };
    case "media_attach":
      only(args, ["kind", "assetUrl", "filename"]);
      return {
        command,
        kind: need(pick(args, "kind", KINDS), "kind"),
        assetUrl: need(text(args, "assetUrl", 1024), "assetUrl"),
        filename: need(text(args, "filename"), "filename"),
      };
    case "media_detach":
      only(args, ["kind"]);
      return { command, kind: need(pick(args, "kind", KINDS), "kind") };
    case "media_trim":
      only(args, ["offsetMs", "durationMs"]);
      return {
        command,
        offsetMs: need(num(args, "offsetMs", 0, 86400000), "offsetMs"),
        durationMs: need(num(args, "durationMs", 1, 60000), "durationMs"),
      };
  }
}
