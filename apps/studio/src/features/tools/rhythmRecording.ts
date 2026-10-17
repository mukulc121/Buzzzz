import { emptyPattern, MAX_PATTERN_MS } from "@buzzzz/core";

export interface IRhythmRecording {
  timestamps: number[];
  limitReached: boolean;
}

export function captureRhythmTap(recording: IRhythmRecording, timestamp: number): IRhythmRecording {
  const { timestamps } = recording;
  if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp < (timestamps.at(-1) ?? 0))
    return recording;
  if (timestamps.length >= 1000 || timestamp - (timestamps[0] ?? timestamp) > MAX_PATTERN_MS)
    return { ...recording, limitReached: true };
  return { timestamps: [...timestamps, timestamp], limitReached: false };
}

export function recordedRhythm(recording: IRhythmRecording, amplitude: number, frequency: number) {
  if (![amplitude, frequency].every((value) => Number.isFinite(value) && value >= 0 && value <= 1))
    throw new Error("Intensity and frequency must be between 0 and 1");
  const first = recording.timestamps[0] ?? 0;
  return {
    ...emptyPattern(),
    discretePattern: recording.timestamps.map((time) => ({
      time: time - first,
      amplitude,
      frequency,
    })),
  };
}

export function recordingStats(recording: IRhythmRecording) {
  const count = recording.timestamps.length;
  const durationMs = count > 1 ? recording.timestamps[count - 1] - recording.timestamps[0] : 0;
  return {
    count,
    durationMs,
    tempoBpm: durationMs > 0 ? Math.round((60000 * (count - 1)) / durationMs) : 0,
  };
}
