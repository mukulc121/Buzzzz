import { isPattern, isRecord, type Pattern } from "../patterns/pattern.ts";
import { isRiveAssetUrl } from "./assets.ts";
import { parseEditorMessage, type EditorMsg } from "./editor.ts";
import { parseLibraryMessage, type LibraryMsg } from "./library.ts";
import { isRiveConfig, type IRiveConfig } from "../rive/config.ts";
export type Msg =
  | {
      type: "load";
      riv: string;
      stateMachine?: string;
      map: Record<string, Pattern>;
      riveConfig?: IRiveConfig;
    }
  | { type: "map"; map: Record<string, Pattern> }
  | { type: "play"; pattern: Pattern }
  | { type: "stop" }
  | { type: "fire"; name: string }
  | { type: "restart" }
  | { type: "pause"; paused: boolean }
  | { type: "hello"; device: string }
  | { type: "fired"; name: string }
  | { type: "peers"; phones: number }
  | LibraryMsg
  | EditorMsg;
const text = (v: unknown): v is string => typeof v === "string" && v.length <= 512;
const isMap = (v: unknown): v is Record<string, Pattern> =>
  isRecord(v) &&
  Object.keys(v).length <= 512 &&
  Object.entries(v).every(([key, value]) => text(key) && isPattern(value));
function loadMessage(value: Record<string, unknown>): Msg | null {
  if (!isRiveAssetUrl(value.riv) || !isMap(value.map)) return null;
  if (value.stateMachine !== undefined && !text(value.stateMachine)) return null;
  if (value.riveConfig !== undefined && !isRiveConfig(value.riveConfig)) return null;
  return {
    type: "load",
    riv: value.riv,
    stateMachine: value.stateMachine,
    map: value.map,
    ...(value.riveConfig === undefined ? {} : { riveConfig: value.riveConfig }),
  };
}
function namedMessage(value: Record<string, unknown>): Msg | null {
  if (!text(value.name)) return null;
  if (value.type === "fire") return { type: "fire", name: value.name };
  return { type: "fired", name: value.name };
}
function peerMessage(value: Record<string, unknown>): Msg | null {
  return typeof value.phones === "number" && Number.isInteger(value.phones) && value.phones >= 0
    ? { type: "peers", phones: value.phones }
    : null;
}
function parseValue(value: Record<string, unknown>): Msg | null {
  switch (value.type) {
    case "load":
      return loadMessage(value);
    case "map":
      return isMap(value.map) ? { type: "map", map: value.map } : null;
    case "play":
      return isPattern(value.pattern) ? { type: "play", pattern: value.pattern } : null;
    case "fire":
    case "fired":
      return namedMessage(value);
    case "hello":
      return text(value.device) ? { type: "hello", device: value.device } : null;
    case "pause":
      return typeof value.paused === "boolean" ? { type: "pause", paused: value.paused } : null;
    case "peers":
      return peerMessage(value);
    case "restart":
    case "stop":
      return { type: value.type };
    default:
      return parseLibraryMessage(value) ?? parseEditorMessage(value);
  }
}
export function parseMessage(data: string): Msg | null {
  try {
    const value: unknown = JSON.parse(data);
    return isRecord(value) ? parseValue(value) : null;
  } catch {
    return null;
  }
}
export function relayUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    if (
      !["ws:", "wss:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.pathname !== "/relay" ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}
export function fromDeepLink(input: string | null): string | null {
  if (!input) return null;
  try {
    const link = new URL(input);
    if (link.protocol !== "rivehaptics:" || link.hostname !== "connect") return null;
    const value = link.searchParams.get("url");
    return value && relayUrl(value) ? value : null;
  } catch {
    return null;
  }
}
