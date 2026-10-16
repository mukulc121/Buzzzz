import { useState } from "react";
import { ToolIcon } from "../../components/ToolIcon";
import type { IToolSession } from "./model";
import {
  captureRhythmTap,
  recordedRhythm,
  recordingStats,
  type IRhythmRecording,
} from "./rhythmRecording";
import "./tapRhythm.css";

interface ITapRhythm extends Pick<IToolSession, "onAppend" | "canEdit"> {}

export function TapRhythm(props: ITapRhythm) {
  const { onAppend, canEdit } = props;
  const [recording, setRecording] = useState<IRhythmRecording>({
    timestamps: [],
    limitReached: false,
  });
  const [amplitude, setAmplitude] = useState(0.8);
  const [frequency, setFrequency] = useState(0.5);
  const stats = recordingStats(recording);
  const capture = () => {
    const timestamp = performance.now();
    setRecording((current) => captureRhythmTap(current, timestamp));
  };
  return (
    <div className="panel-content tap-rhythm">
      <section>
        <h3>Tap the rhythm</h3>
        <button
          type="button"
          className="tap-rhythm-pad"
          aria-label="Tap pad - tap in time with the rhythm"
          disabled={recording.limitReached || stats.count >= 1000}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.focus();
            capture();
          }}
          onKeyDown={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) capture();
          }}
        >
          <ToolIcon name="drum" size={30} />
          <span>
            {stats.count === 0
              ? "Tap here to start"
              : `${stats.count} ${stats.count === 1 ? "tap" : "taps"}`}
          </span>
        </button>
        <p className="hint">
          Click the pad or press Space in time with the beat. Every tap becomes a discrete event on
          the chart.
        </p>
        {recording.limitReached && (
          <p role="status">Recording limit reached. Reset to record again.</p>
        )}
      </section>
      <section>
        <h3>Recording</h3>
        <dl className="tap-rhythm-stats" aria-live="polite">
          <div>
            <dt>Taps</dt>
            <dd>{stats.count}</dd>
          </div>
          <div>
            <dt>Length</dt>
            <dd>{Math.round(stats.durationMs)} ms</dd>
          </div>
          <div>
            <dt>Tempo</dt>
            <dd>{stats.tempoBpm > 0 ? `${stats.tempoBpm} bpm` : "-"}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h3>Event strength</h3>
        <label>
          Intensity {amplitude.toFixed(2)}
          <input
            type="range"
            aria-label="Rhythm intensity"
            min={0}
            max={1}
            step={0.01}
            value={amplitude}
            onChange={(event) => setAmplitude(event.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          Frequency {frequency.toFixed(2)}
          <input
            type="range"
            aria-label="Rhythm frequency"
            min={0}
            max={1}
            step={0.01}
            value={frequency}
            onChange={(event) => setFrequency(event.currentTarget.valueAsNumber)}
          />
        </label>
      </section>
      <div className="row">
        <button
          type="button"
          className="primary"
          disabled={!stats.count || !canEdit}
          onClick={() => onAppend(recordedRhythm(recording, amplitude, frequency), 0)}
        >
          <ToolIcon name="plus" />
          Generate events
        </button>
        <button
          type="button"
          disabled={!stats.count}
          onClick={() => setRecording({ timestamps: [], limitReached: false })}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
