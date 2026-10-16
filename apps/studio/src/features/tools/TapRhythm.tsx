import { useRef, useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { rhythmPattern } from "./patternMath";
import { patternStats } from "./signalStats";

interface ITapRhythm {
  onAdd: (pattern?: Pattern, name?: string) => void;
  onPreview?: (pattern: Pattern) => void;
}

export function TapRhythm(props: ITapRhythm) {
  const start = useRef<number | null>(null);
  const [times, setTimes] = useState<number[]>([]);
  const [amplitude, setAmplitude] = useState(0.8);
  const [frequency, setFrequency] = useState(0.5);
  const [finished, setFinished] = useState(false);
  const tap = () => {
    const now = performance.now();
    start.current ??= now;
    const time = Math.round(now - start.current);
    if (time > 60000) {
      setFinished(true);
      return;
    }
    if (time <= 60000)
      setTimes((previous) => (previous.length < 1000 ? [...previous, time] : previous));
  };
  const pattern = rhythmPattern(times, amplitude, frequency);
  const stats = patternStats(pattern);
  return (
    <div className="panel-content">
      <p>Focus the pad and press Space, or tap it. Recording starts on the first tap.</p>
      <label>
        Intensity {amplitude.toFixed(2)}
        <input
          type="range"
          aria-label="Rhythm intensity"
          min="0"
          max="1"
          step="0.01"
          value={amplitude}
          onChange={(event) => setAmplitude(Number(event.target.value))}
        />
      </label>
      <label>
        Frequency {frequency.toFixed(2)}
        <input
          type="range"
          aria-label="Rhythm frequency"
          min="0"
          max="1"
          step="0.01"
          value={frequency}
          onChange={(event) => setFrequency(Number(event.target.value))}
        />
      </label>
      <button
        className="primary"
        disabled={finished || times.length >= 1000}
        onClick={tap}
        onKeyDown={(event) => {
          if (event.code === "Space" || event.key === "Enter") {
            event.stopPropagation();
            if (event.repeat) event.preventDefault();
          }
        }}
      >
        Tap rhythm
      </button>
      {finished && <p role="status">60 seconds reached. Reset to record again.</p>}
      <p role="status">
        {times.length} taps · {(stats.durationMs / 1000).toFixed(2)}s
        {stats.tempoBpm ? ` · ${Math.round(stats.tempoBpm)}BPM` : ""}
      </p>
      <div className="row">
        <button
          disabled={!times.length || !props.onPreview}
          onClick={() => props.onPreview?.(pattern)}
        >
          Preview rhythm
        </button>
        <button disabled={!times.length} onClick={() => props.onAdd(pattern, "Tapped rhythm")}>
          Add rhythm
        </button>
        <button
          onClick={() => {
            start.current = null;
            setFinished(false);
            setTimes([]);
          }}
        >
          Reset rhythm
        </button>
      </div>
    </div>
  );
}
