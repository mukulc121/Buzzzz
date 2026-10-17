import { isPattern, isRecord, MAX_PATTERN_MS, type Pattern } from "../patterns/pattern.ts";

interface ILibraryPreset {
  resourceId: string;
  name: string;
}

interface ILibraryClip {
  clipId: string;
  downloadUrl: string;
  contentType: string;
  size: number;
}

interface ILibraryAnimation extends ILibraryClip {
  totalFrames: number;
  frameRate: number;
  width: number;
  height: number;
}

interface ILibraryMedia {
  resourceId: string;
  name: string;
  version: string;
  durationMs: number;
  pattern: Pattern;
  volume?: number;
  offsetMs?: number;
  window?: { startMs: number; durationMs: number };
}

export type LibraryMsg =
  | { type: "library-manifest"; presets: ILibraryPreset[] }
  | { type: "library-manifest-request" }
  | { type: "haptic-preset"; resourceId: string; name: string; version: string; pattern: Pattern }
  | (ILibraryMedia & { type: "audio-haptics"; audio: ILibraryClip })
  | (ILibraryMedia & { type: "animation-haptics"; animation: ILibraryAnimation });

const text = (value: unknown): value is string => typeof value === "string" && value.length <= 512;
const resourceId = (value: unknown): value is string => text(value) && value.length > 0;
const isPreset = (value: unknown): value is ILibraryPreset =>
  isRecord(value) && resourceId(value.resourceId) && text(value.name);
const finite = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;
const version = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

function localHost(hostname: string): boolean {
  if (["localhost", "[::1]"].includes(hostname)) return true;
  const octets = hostname.split(".").map(Number);
  if (
    octets.length !== 4 ||
    !octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  )
    return false;
  return (
    octets[0] === 127 ||
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isDownloadUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1024) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || (url.protocol === "http:" && localHost(url.hostname))) &&
      !url.username &&
      !url.password &&
      !url.hash &&
      /^\/v1\/rooms\/[a-f0-9]{32}\/assets\/[a-f0-9]{32}\.bin$/.test(url.pathname) &&
      /^\?token=[A-Za-z0-9_-]{43}$/.test(url.search)
    );
  } catch {
    return false;
  }
}

function readClip(value: unknown, kind: "audio" | "animation"): ILibraryClip | null {
  if (
    !isRecord(value) ||
    !resourceId(value.clipId) ||
    value.clipId === "." ||
    value.clipId === ".." ||
    /[\\/\0]/.test(value.clipId) ||
    !isDownloadUrl(value.downloadUrl) ||
    !text(value.contentType) ||
    !(
      kind === "audio"
        ? /^audio\/[a-z0-9.+-]+$/
        : /^(?:video\/[a-z0-9.+-]+|application\/(?:json|zip\+dotlottie))$/
    ).test(value.contentType) ||
    !Number.isSafeInteger(value.size) ||
    !finite(value.size, 20 * 1024 * 1024) ||
    value.size === 0
  )
    return null;
  return {
    clipId: value.clipId,
    downloadUrl: value.downloadUrl,
    contentType: value.contentType,
    size: value.size,
  };
}

function readWindow(value: unknown): ILibraryMedia["window"] | null {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    !finite(value.startMs) ||
    !finite(value.durationMs, MAX_PATTERN_MS) ||
    value.durationMs === 0 ||
    !finite(value.startMs + value.durationMs)
  )
    return null;
  return { startMs: value.startMs, durationMs: value.durationMs };
}

function readMedia(value: Record<string, unknown>): LibraryMsg | null {
  if (
    !resourceId(value.resourceId) ||
    !text(value.name) ||
    !version(value.version) ||
    !finite(value.durationMs, MAX_PATTERN_MS) ||
    !isPattern(value.pattern) ||
    (value.volume !== undefined && !finite(value.volume, 1)) ||
    (value.offsetMs !== undefined && !finite(value.offsetMs, MAX_PATTERN_MS))
  )
    return null;
  const window = readWindow(value.window);
  if (window === null) return null;
  const media: ILibraryMedia = {
    resourceId: value.resourceId,
    name: value.name,
    version: value.version,
    durationMs: value.durationMs,
    pattern: value.pattern,
    ...(value.volume !== undefined ? { volume: value.volume } : {}),
    ...(value.offsetMs !== undefined ? { offsetMs: value.offsetMs } : {}),
    ...(window ? { window } : {}),
  };
  if (value.type === "audio-haptics") {
    const audio = readClip(value.audio, "audio");
    return audio ? { type: "audio-haptics", ...media, audio } : null;
  }
  const animation = readClip(value.animation, "animation");
  const metadata = value.animation;
  if (
    !animation ||
    !isRecord(metadata) ||
    !finite(metadata.totalFrames) ||
    !finite(metadata.frameRate) ||
    metadata.frameRate === 0 ||
    !finite(metadata.width) ||
    metadata.width === 0 ||
    !finite(metadata.height) ||
    metadata.height === 0
  )
    return null;
  return {
    type: "animation-haptics",
    ...media,
    animation: {
      ...animation,
      totalFrames: metadata.totalFrames,
      frameRate: metadata.frameRate,
      width: metadata.width,
      height: metadata.height,
    },
  };
}

export function parseLibraryMessage(value: Record<string, unknown>): LibraryMsg | null {
  switch (value.type) {
    case "library-manifest": {
      const presets = value.presets;
      if (!Array.isArray(presets) || presets.length > 1000 || !presets.every(isPreset)) return null;
      if (new Set(presets.map((preset) => preset.resourceId)).size !== presets.length) return null;
      return {
        type: "library-manifest",
        presets: presets.map((preset) => ({ resourceId: preset.resourceId, name: preset.name })),
      };
    }
    case "library-manifest-request":
      return { type: "library-manifest-request" };
    case "haptic-preset":
      if (
        !resourceId(value.resourceId) ||
        !text(value.name) ||
        !version(value.version) ||
        !isPattern(value.pattern)
      )
        return null;
      return {
        type: "haptic-preset",
        resourceId: value.resourceId,
        name: value.name,
        version: value.version,
        pattern: value.pattern,
      };
    case "audio-haptics":
    case "animation-haptics":
      return readMedia(value);
    default:
      return null;
  }
}
