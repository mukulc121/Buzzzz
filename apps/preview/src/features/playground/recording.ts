import { emptyPattern, MAX_PATTERN_MS, type Pattern } from "@buzzzz/core";

const unit = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
export function padValue(x: number, y: number, width: number, height: number) {
  return { amplitude: unit(1 - y / Math.max(1, height)), frequency: unit(x / Math.max(1, width)) };
}
export function recording() {
  return { startedAt: Date.now(), pattern: emptyPattern() };
}
type Recording = ReturnType<typeof recording>;
export function appendSample(
  record: Recording,
  value: ReturnType<typeof padValue> | null,
  now = Date.now(),
) {
  const time = Math.min(
    MAX_PATTERN_MS,
    Math.max(0, Math.round((now - record.startedAt) / 10) * 10),
  );
  const amplitude = record.pattern.continuousPattern.amplitude;
  const frequency = record.pattern.continuousPattern.frequency;
  const last = amplitude.at(-1);
  if (last?.time === time) {
    last.value = value?.amplitude ?? 0;
    frequency[frequency.length - 1].value = value?.frequency ?? frequency.at(-1)?.value ?? 0.5;
  } else {
    amplitude.push({ time, value: value?.amplitude ?? 0 });
    frequency.push({ time, value: value?.frequency ?? frequency.at(-1)?.value ?? 0.5 });
  }
}
export function appendTap(record: Recording, value: ReturnType<typeof padValue>, now = Date.now()) {
  if (record.pattern.discretePattern.length >= 6000) return;
  record.pattern.discretePattern.push({
    time: Math.min(MAX_PATTERN_MS, Math.max(0, now - record.startedAt)),
    ...value,
  });
}
export function recordedPattern(record: Recording): Pattern {
  return record.pattern;
}
