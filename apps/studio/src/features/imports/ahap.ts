import { emptyPattern, isPattern, isRecord, toDevice } from "@buzzzz/core";
import type { Pattern } from "@buzzzz/core";
import { numberIn } from "./pattern";

interface IEvent {
  start: number;
  end: number;
  amplitude: number;
  frequency: number;
}
interface IControl {
  time: number;
  values: { time: number; value: number }[];
}
const unit = (value: number) => Math.max(0, Math.min(1, value));
function finite(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("AHAP parameter values must be finite numbers");
  return value;
}
function controlAt(controls: IControl[], time: number, fallback: number) {
  let low = 0;
  let high = controls.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (controls[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  const selected = controls[low - 1];
  if (!selected) return fallback;
  const points = selected.values;
  low = 0;
  high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].time < time) low = middle + 1;
    else high = middle;
  }
  const right = low;
  if (right === points.length) return points.at(-1)?.value ?? fallback;
  if (!right) return points[0].value;
  const before = points[right - 1];
  const after = points[right];
  return (
    before.value +
    ((after.value - before.value) * (time - before.time)) / Math.max(1e-8, after.time - before.time)
  );
}
function compact(points: Pattern["continuousPattern"]["amplitude"]) {
  const result: typeof points = [];
  for (const point of points) {
    const last = result.at(-1);
    const before = result.at(-2);
    if (last && before) {
      const expected =
        before.value +
        ((point.value - before.value) * (last.time - before.time)) /
          Math.max(1e-8, point.time - before.time);
      if (Math.abs(expected - last.value) < 1e-5) result.pop();
    }
    result.push(point);
  }
  return result;
}

export function readAhap(value: unknown): { pattern: Pattern; warnings: string[] } | null {
  if (!isRecord(value) || !Array.isArray(value.Pattern)) return null;
  if (value.Pattern.length > 10000) throw new Error("AHAP files support up to 10,000 entries");
  const pattern = emptyPattern();
  const events: IEvent[] = [];
  const intensity: IControl[] = [];
  const sharpness: IControl[] = [];
  const times = new Set<number>();
  const warnings = new Set<string>();
  let controlPoints = 0;
  for (const entry of value.Pattern) {
    if (!isRecord(entry)) throw new Error("Invalid AHAP pattern entry");
    if (isRecord(entry.Event)) {
      const event = entry.Event;
      const start = numberIn(event.Time ?? 0, 60, "AHAP event time") * 1000;
      if (event.EventType !== "HapticTransient" && event.EventType !== "HapticContinuous") {
        if (event.EventType !== "AudioCustom" && event.EventType !== "AudioContinuous")
          throw new Error("This AHAP event type is not supported");
        warnings.add("AHAP audio events are not included in the haptic pattern.");
        continue;
      }
      let amplitude = 1;
      let frequency = 0.5;
      if (event.EventParameters !== undefined && !Array.isArray(event.EventParameters))
        throw new Error("AHAP event parameters must be an array");
      for (const parameter of Array.isArray(event.EventParameters) ? event.EventParameters : []) {
        if (!isRecord(parameter) || typeof parameter.ParameterID !== "string")
          throw new Error("Invalid AHAP event parameter");
        const amount = finite(parameter.ParameterValue ?? parameter.Value);
        if (parameter.ParameterID === "HapticIntensity") amplitude = unit(amount);
        else if (parameter.ParameterID === "HapticSharpness") frequency = unit(amount);
        else
          warnings.add(
            "Attack, decay, release and other AHAP event parameters are not modeled by the three haptic layers.",
          );
      }
      if (event.EventType === "HapticTransient")
        pattern.discretePattern.push({ time: start, amplitude, frequency });
      else {
        const duration =
          numberIn(event.EventDuration ?? event.Duration, 60, "AHAP duration") * 1000;
        if (!duration || start + duration > 60000)
          throw new Error(
            "AHAP continuous events must end within 60 seconds and have positive duration",
          );
        events.push({ start, end: start + duration, amplitude, frequency });
        for (const time of [start, start + duration, start - 1, start + duration - 1])
          if (time >= 0) times.add(time);
      }
    } else if (isRecord(entry.ParameterCurve) || isRecord(entry.Parameter)) {
      const control = isRecord(entry.ParameterCurve) ? entry.ParameterCurve : entry.Parameter;
      if (!isRecord(control)) throw new Error("Invalid AHAP dynamic parameter");
      const time = numberIn(control.Time ?? 0, 60, "AHAP parameter time") * 1000;
      const target =
        control.ParameterID === "HapticIntensityControl"
          ? intensity
          : control.ParameterID === "HapticSharpnessControl"
            ? sharpness
            : null;
      if (!target) {
        warnings.add("Unsupported AHAP dynamic parameters are omitted.");
        continue;
      }
      const raw = isRecord(entry.ParameterCurve)
        ? control.ParameterCurveControlPoints
        : [{ Time: 0, ParameterValue: control.ParameterValue }];
      if (!Array.isArray(raw) || !raw.length || raw.length > 10000)
        throw new Error("AHAP parameter curves need 1–10,000 control points");
      controlPoints += raw.length;
      if (controlPoints > 10000)
        throw new Error("AHAP dynamic parameters exceed the 10,000-point limit");
      const values = raw
        .map((point) => {
          if (!isRecord(point)) throw new Error("Invalid AHAP parameter control point");
          const at = time + numberIn(point.Time, 60, "AHAP curve time") * 1000;
          if (at > 60000) throw new Error("AHAP parameter curves must end within 60 seconds");
          times.add(at);
          const amount = finite(point.ParameterValue);
          return {
            time: at,
            value: target === intensity ? unit(amount) : Math.max(-1, Math.min(1, amount)),
          };
        })
        .sort((left, right) => left.time - right.time);
      target.push({ time, values });
    } else throw new Error("AHAP entries must contain an event or dynamic parameter");
  }
  intensity.sort((left, right) => left.time - right.time);
  sharpness.sort((left, right) => left.time - right.time);
  for (const tap of pattern.discretePattern) tap.amplitude *= controlAt(intensity, tap.time, 1);
  if (events.length) {
    events.sort((left, right) => left.start - right.start);
    const end = Math.max(...events.map((event) => event.end));
    for (let time = 0; time <= end; time += 10) times.add(time);
    times.add(end);
    let next = 0;
    let active: IEvent[] = [];
    for (const time of [...times]
      .filter((time) => time <= end)
      .sort((left, right) => left - right)) {
      while (next < events.length && events[next].start <= time) active.push(events[next++]);
      active = active.filter((event) => event.end > time);
      const gain = controlAt(intensity, time, 1);
      const shift = controlAt(sharpness, time, 0);
      let amplitude = 0;
      let frequency = 0;
      let weight = 0;
      for (const event of active) {
        const strength = unit(event.amplitude * gain);
        amplitude = Math.max(amplitude, strength);
        frequency += strength * unit(event.frequency + shift);
        weight += strength;
      }
      pattern.continuousPattern.amplitude.push({ time, value: amplitude });
      pattern.continuousPattern.frequency.push({
        time,
        value: weight > 0 ? frequency / weight : 0.5,
      });
    }
    pattern.continuousPattern.amplitude = compact(pattern.continuousPattern.amplitude);
    pattern.continuousPattern.frequency = compact(pattern.continuousPattern.frequency);
    if (events.some((event, index) => index > 0 && event.start < events[index - 1].end))
      warnings.add(
        "Overlapping continuous events use the strongest intensity and an intensity-weighted sharpness.",
      );
  }
  if (!isPattern(pattern))
    throw new Error("The converted AHAP pattern exceeds the 10,000-point limit");
  return { pattern: toDevice(pattern), warnings: [...warnings] };
}
