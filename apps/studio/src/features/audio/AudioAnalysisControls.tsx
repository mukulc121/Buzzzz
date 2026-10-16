import { AUDIO_ANALYSES } from "./analysis";
import type { useAudioTrack } from "./useAudioTrack";

interface IAudioAnalysisControls {
  audio: ReturnType<typeof useAudioTrack>;
}

export function AudioAnalysisControls(props: IAudioAnalysisControls) {
  const { audio } = props;
  return (
    <fieldset className="audio-controls">
      <legend>Signal analysis</legend>
      <div className="row">
        <label className="field">
          Frame size (ms)
          <input
            type="number"
            min={2}
            max={100}
            step={1}
            value={audio.frameMs}
            onChange={(event) =>
              audio.setFrameMs(Math.max(2, Math.min(100, event.currentTarget.valueAsNumber || 20)))
            }
          />
        </label>
        <div className="field">
          <span>Values</span>
          <div className="seg" role="group" aria-label="Analysis value scaling">
            <button
              type="button"
              aria-pressed={audio.displayMode === "fit"}
              className={audio.displayMode === "fit" ? "on" : ""}
              onClick={() => audio.setDisplayMode("fit")}
            >
              Fit
            </button>
            <button
              type="button"
              aria-pressed={audio.displayMode === "true"}
              className={audio.displayMode === "true" ? "on" : ""}
              onClick={() => audio.setDisplayMode("true")}
            >
              True
            </button>
          </div>
        </div>
        <label className="audio-check">
          <input
            type="checkbox"
            checked={audio.decibels}
            onChange={(event) => audio.setDecibels(event.currentTarget.checked)}
          />
          dB scale
        </label>
      </div>
      <div className="audio-metrics">
        {AUDIO_ANALYSES.map((metric) => (
          <label key={metric.id} className="audio-check" title={metric.description}>
            <input
              type="checkbox"
              checked={audio.selectedMetrics.includes(metric.id)}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                audio.setSelectedMetrics((selected) =>
                  checked ? [...selected, metric.id] : selected.filter((id) => id !== metric.id),
                );
              }}
            />
            {metric.label}
          </label>
        ))}
      </div>
      <p className="hint">
        Fit scales each curve to its peak. True keeps its normalized value. dB uses a −60 dB floor.
        Estimates are described on hover.
      </p>
    </fieldset>
  );
}
