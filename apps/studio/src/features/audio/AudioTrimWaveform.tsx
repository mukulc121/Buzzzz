import { useMemo } from "react";
import type { IAudioDecoded } from "./model";

interface IAudioTrimWaveform {
  source: IAudioDecoded;
  trim: { startMs: number; endMs: number };
  onChange: (startMs: number, endMs: number) => void;
}

function waveform(samples: Float32Array) {
  const count = 256;
  let path = "";
  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor((bucket * samples.length) / count);
    const end = Math.floor(((bucket + 1) * samples.length) / count);
    const stride = Math.max(1, Math.floor((end - start) / 64));
    let peak = 0;
    for (let sample = start; sample < end; sample += stride)
      peak = Math.max(peak, Math.abs(samples[sample] ?? 0));
    const x = (bucket / count) * 1000;
    path += `M${x},${40 - peak * 38}V${40 + peak * 38}`;
  }
  return path;
}

export function AudioTrimWaveform(props: IAudioTrimWaveform) {
  const { source, trim, onChange } = props;
  const samples = source.channels[0];
  const path = useMemo(() => (samples ? waveform(samples) : ""), [samples]);
  return (
    <div className="sound-trim-waveform">
      <svg
        viewBox="0 0 1000 80"
        preserveAspectRatio="none"
        role="img"
        aria-label="Audio trimming waveform"
      >
        <path d={path} fill="none" stroke="var(--ok)" strokeWidth="2" />
      </svg>
      <div
        className="sound-trim-shade"
        style={{ left: 0, width: `${(trim.startMs / source.durationMs) * 100}%` }}
      />
      <div
        className="sound-trim-shade"
        style={{ right: 0, width: `${(1 - trim.endMs / source.durationMs) * 100}%` }}
      />
      <input
        className="sound-trim-handle"
        aria-label="Audio trim start"
        type="range"
        min={0}
        max={source.durationMs}
        step={1}
        value={trim.startMs}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber, trim.endMs)}
      />
      <input
        className="sound-trim-handle"
        aria-label="Audio trim end"
        type="range"
        min={0}
        max={source.durationMs}
        step={1}
        value={trim.endMs}
        onChange={(event) => onChange(trim.startMs, event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
