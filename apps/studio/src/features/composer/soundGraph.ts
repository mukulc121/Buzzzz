import type { Pattern } from "@buzzzz/core";

type Point = Pattern["continuousPattern"]["amplitude"][number];
type Tap = Pattern["discretePattern"][number];

// Adapted from Pulsar's MIT-licensed audio-player.ts; see THIRD_PARTY_NOTICES.md.
const tapVoices = [
  { frequency: 1, target: 0.2, sweep: 0.028, attack: 0.002, release: 0.014 },
  { frequency: 1.5, target: 0.4, sweep: 0.031, attack: 0, release: 0.015 },
  { frequency: 0.3, target: 0.5, sweep: 0.039, attack: 0.005, release: 0.018 },
] as const;
const continuousVoices = [
  { amplitude: 0.6, frequency: 0.8, waveform: "sine" },
  { amplitude: 0.2, frequency: 0.4, waveform: "triangle" },
  { amplitude: 0.5, frequency: 1, waveform: "sine" },
] as const;

function valueAt(points: readonly Point[], seconds: number) {
  const time = seconds * 1000;
  if (time <= points[0]!.time) return points[0]!.value;
  if (time >= points.at(-1)!.time) return points.at(-1)!.value;
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    if (time === point.time) return point.value;
    if (time < point.time) {
      const previous = points[index - 1]!;
      const ratio = (time - previous.time) / (point.time - previous.time);
      return previous.value + (point.value - previous.value) * ratio;
    }
  }
  return 0;
}

function tapNodes(context: BaseAudioContext, tap: Tap, target: AudioNode, offset: number) {
  return tapVoices.map((voice) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = offset + tap.time / 1000;
    const duration = voice.attack + voice.release;
    const frequency = (60 + 380 * tap.frequency) * voice.frequency;
    const volume = 0.1 / 3 + (0.9 / 3) * tap.amplitude;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (frequency * voice.target > 20)
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * voice.target,
        start + Math.min(voice.sweep, duration),
      );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + voice.attack);
    gain.gain.linearRampToValueAtTime(volume, start + voice.attack);
    gain.gain.setValueAtTime(volume, start + voice.attack);
    gain.gain.linearRampToValueAtTime(0, start + voice.attack + voice.release);
    oscillator.connect(gain).connect(target);
    oscillator.start(start);
    oscillator.stop(start + duration);
    return { oscillator, gain };
  });
}

function continuousNodes(
  context: BaseAudioContext,
  pattern: Pattern,
  target: AudioNode,
  offset: number,
) {
  const { amplitude, frequency } = pattern.continuousPattern;
  if (!amplitude.length || !frequency.length) return [];
  const duration = amplitude.at(-1)!.time / 1000 + 0.01;
  return continuousVoices.map((voice) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const amplitudePoints = amplitude.map((point) => ({
      time: point.time,
      value: point.value * voice.amplitude,
    }));
    const frequencyPoints = frequency.map((point) => ({
      time: point.time,
      value: (80 + 150 * point.value) * voice.frequency,
    }));
    oscillator.type = voice.waveform;
    for (let time = 0; time <= duration; time += 0.01) {
      gain.gain.setValueAtTime(valueAt(amplitudePoints, time), offset + time);
      oscillator.frequency.setValueAtTime(valueAt(frequencyPoints, time), offset + time);
    }
    oscillator.connect(gain).connect(target);
    oscillator.start(offset);
    oscillator.stop(offset + duration);
    return { oscillator, gain };
  });
}

// Seconds until the last scheduled voice ends, as Pulsar's renderer sizes its buffer.
export function soundDuration(pattern: Pattern) {
  const tapEnd = Math.max(0, ...tapVoices.map((voice) => voice.attack + voice.release));
  const { amplitude, frequency } = pattern.continuousPattern;
  let end = amplitude.length && frequency.length ? amplitude.at(-1)!.time / 1000 + 0.01 : 0;
  for (const tap of pattern.discretePattern) end = Math.max(end, tap.time / 1000 + tapEnd);
  return end;
}

export function schedulePatternSound(context: BaseAudioContext, pattern: Pattern, offset: number) {
  const master = context.createGain();
  master.gain.value = 1;
  master.connect(context.destination);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, context.currentTime);
  filter.Q.setValueAtTime(5, context.currentTime);
  filter.connect(master);
  const tapTarget = pattern.continuousPattern.amplitude.length ? filter : master;
  const nodes = [
    ...pattern.discretePattern.flatMap((tap) => tapNodes(context, tap, tapTarget, offset)),
    ...continuousNodes(context, pattern, filter, offset),
  ];
  const disconnect = () => {
    filter.disconnect();
    master.disconnect();
  };
  if (!nodes.length) disconnect();
  for (const { oscillator, gain } of nodes) {
    oscillator.addEventListener(
      "ended",
      () => {
        oscillator.disconnect();
        gain.disconnect();
      },
      { once: true },
    );
  }
  return () => {
    for (const { oscillator } of nodes) oscillator.stop();
    disconnect();
  };
}
