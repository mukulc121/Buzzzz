import type { ICachedResource } from "./mediaModel";
import { formatLibraryTime } from "./canvasGeometry";

const icons: Record<ICachedResource["kind"], "play" | "sparkles" | "record"> = {
  audio: "play",
  animation: "sparkles",
  pattern: "record",
};

export function mediaStatusText(
  record: ICachedResource | null,
  positionMs: number,
  downloading: boolean,
  progress: number,
  error: string | null,
): string {
  if (downloading) return `Downloading… ${Math.round(progress * 100)}%`;
  if (error) return error;
  return `${formatLibraryTime(positionMs)} / ${formatLibraryTime(record?.durationMs ?? 0)}`;
}

export function resourceKindLabel(kind: ICachedResource["kind"]): string {
  return { audio: "Audio", animation: "Animation", pattern: "Pattern" }[kind];
}

export function resourceKindIcon(kind: ICachedResource["kind"]) {
  return icons[kind];
}
