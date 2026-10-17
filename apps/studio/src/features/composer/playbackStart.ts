import type { IPlaybackRange } from "./model";

export function playbackStart(range: IPlaybackRange, cursor: number): number {
  return cursor > range.start && cursor < range.end ? cursor : range.start;
}
