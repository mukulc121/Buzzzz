import { isRecord } from "../patterns/pattern.ts";

export const EDITOR_COMMANDS = [
  "audio_analyze",
  "audio_generate",
  "animation_analyze",
  "animation_generate",
  "editor_selection",
  "editor_cursor",
  "editor_range",
  "editor_history",
  "media_attach",
  "media_detach",
  "media_trim",
] as const;
export type EditorCommand = (typeof EDITOR_COMMANDS)[number];

export const EDITOR_LIMITS = { argsBytes: 64 * 1024, resultBytes: 1024 * 1024, errorLength: 1024 };

export type EditorOutcome = { result: unknown } | { error: string };
export type EditorMsg =
  | { type: "project-changed"; revision: number }
  | {
      type: "editor-command";
      requestId: string;
      command: EditorCommand;
      args: Record<string, unknown>;
    }
  | ({ type: "editor-result"; requestId: string } & EditorOutcome);

function bytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value) ?? "").byteLength;
  } catch {
    return Infinity;
  }
}
const isRequestId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
export const isEditorCommand = (value: unknown): value is EditorCommand =>
  EDITOR_COMMANDS.some((command) => command === value);

function resultMessage(value: Record<string, unknown>): EditorMsg | null {
  const hasError = Object.hasOwn(value, "error");
  if (!isRequestId(value.requestId) || hasError === Object.hasOwn(value, "result")) return null;
  if (bytes(value) > EDITOR_LIMITS.resultBytes) return null;
  if (!hasError) return { type: "editor-result", requestId: value.requestId, result: value.result };
  return typeof value.error === "string" && value.error.length <= EDITOR_LIMITS.errorLength
    ? { type: "editor-result", requestId: value.requestId, error: value.error }
    : null;
}

export function parseEditorMessage(value: Record<string, unknown>): EditorMsg | null {
  switch (value.type) {
    case "project-changed":
      return Number.isSafeInteger(value.revision) &&
        typeof value.revision === "number" &&
        value.revision >= 0
        ? { type: "project-changed", revision: value.revision }
        : null;
    case "editor-command":
      return isRequestId(value.requestId) &&
        isEditorCommand(value.command) &&
        isRecord(value.args) &&
        bytes(value.args) <= EDITOR_LIMITS.argsBytes
        ? {
            type: "editor-command",
            requestId: value.requestId,
            command: value.command,
            args: value.args,
          }
        : null;
    case "editor-result":
      return resultMessage(value);
    default:
      return null;
  }
}

// Builds a reply the relay accepts: undefined becomes null, oversized results become errors.
export function editorResult(requestId: string, outcome: EditorOutcome): EditorMsg {
  if ("error" in outcome)
    return {
      type: "editor-result",
      requestId,
      error: outcome.error.slice(0, EDITOR_LIMITS.errorLength) || "Editor command failed",
    };
  const message = { type: "editor-result" as const, requestId, result: outcome.result ?? null };
  return bytes(message) > EDITOR_LIMITS.resultBytes
    ? { type: "editor-result", requestId, error: "Editor result exceeds 1 MiB" }
    : message;
}
