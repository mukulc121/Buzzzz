import type { Pattern } from "@buzzzz/core";
import type { IVoiceSignal } from "../audio/voice/analysis";

interface IVoiceTake {
  signal: IVoiceSignal;
  pattern: Pattern;
  pitch: boolean;
}

export function VoiceTake(props: IVoiceTake) {
  const { signal, pattern, pitch } = props;
  const { amplitude, frequency } = pattern.continuousPattern;
  const x = (time: number) => (time / Math.max(1, signal.durationMs)) * 100;
  const mean = frequency.reduce((total, point) => total + point.value, 0) / frequency.length;
  const hz =
    2 ** (Math.log2(60) + Math.min(1, Math.max(0, mean)) * (Math.log2(300) - Math.log2(60)));
  const stats = [
    ["Length", `${Math.round(signal.durationMs)} ms`],
    ["Pitch", signal.medianPitchHz > 0 ? `${Math.round(signal.medianPitchHz)} Hz` : "-"],
    ["Feels like", frequency.length ? `${Math.round(hz)} Hz` : "-"],
    ["Points", `${amplitude.length}`],
    ["Accents", `${pattern.discretePattern.length}`],
  ];
  return (
    <section>
      <h3>Take</h3>
      <svg
        className="voice-preview"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Preview of the recorded envelope"
      >
        {pattern.discretePattern.map((event) => (
          <line
            className="voice-preview-event"
            key={event.time}
            x1={x(event.time)}
            x2={x(event.time)}
            y1={0}
            y2={100}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {amplitude.length > 0 && (
          <polyline
            points={amplitude
              .map((point) => `${x(point.time)},${(1 - point.value) * 100}`)
              .join(" ")}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <dl className="voice-stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {signal.voicedShare < 0.2 && pitch && (
        <p className="voice-hint">
          Almost none of that take was pitched - for a hiss or a rasp, switch the frequency to
          Brightness.
        </p>
      )}
    </section>
  );
}
