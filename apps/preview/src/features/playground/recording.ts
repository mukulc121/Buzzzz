import { emptyPattern, type Pattern } from "@buzzzz/core";

export const MAX_RECORDING_DURATION_MS = 20000;

export interface IPlaygroundEvent {
  type: "tap" | "pan";
  time: number;
  x: number;
  y: number;
}

export function padValue(x: number, y: number, width: number, height: number, tutorial = false) {
  "worklet";
  const frequency = width > 0 ? Math.max(0, Math.min(width, x)) / width : 0;
  const vertical = 1 - (height > 0 ? Math.max(0, Math.min(height, y)) / height : 0);
  return { amplitude: tutorial ? vertical : 0.2 + 0.8 * vertical, frequency };
}

export function indicatorPosition(x: number, y: number, width: number, height: number) {
  "worklet";
  if (x === -100 && y === -100) return { x, y };
  return {
    x: Math.max(15, Math.min(x, width - 15)),
    y: Math.max(15, Math.min(y, height - 15)),
  };
}

export function recordedPattern(events: readonly IPlaygroundEvent[]): Pattern {
  const pattern = emptyPattern();
  let group: IPlaygroundEvent[] = [];
  const finish = () => {
    if (!group.length) return;
    for (const event of group) {
      pattern.continuousPattern.amplitude.push({ time: event.time, value: event.y });
      pattern.continuousPattern.frequency.push({ time: event.time, value: event.x });
    }
    const last = group[group.length - 1]!;
    pattern.continuousPattern.amplitude.push({ time: last.time, value: 0 });
    pattern.continuousPattern.frequency.push({ time: last.time, value: 0 });
    group = [];
  };
  for (const event of events) {
    if (event.type === "tap") {
      pattern.discretePattern.push({ time: event.time, amplitude: event.y, frequency: event.x });
    } else {
      if (group.length && event.time - group[group.length - 1]!.time >= 100) finish();
      group.push(event);
    }
  }
  finish();
  return pattern;
}

export function patternShareMessage(events: readonly IPlaygroundEvent[]): string | null {
  return events.length
    ? `Pulsar custom preset\n\n${JSON.stringify(recordedPattern(events), null, 2)}`
    : null;
}

export function playgroundTimer(
  recording: boolean,
  playing: boolean,
  elapsed: number,
  duration: number,
) {
  if (playing)
    return {
      label: "Playing",
      text: `${(elapsed / 1000).toFixed(1)}s / ${(duration / 1000).toFixed(1)}s`,
    };
  return { label: recording ? "Recording" : "Duration", text: `${(elapsed / 1000).toFixed(1)}s` };
}
