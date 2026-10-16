import type { useAudioTrack } from "./useAudioTrack";

interface IAudioTrimControls {
  audio: ReturnType<typeof useAudioTrack>;
}

export function AudioTrimControls(props: IAudioTrimControls) {
  const { audio } = props;
  const { source, trim } = audio;
  if (!source) return null;
  return (
    <fieldset className="audio-controls">
      <legend>Audio trim</legend>
      <div className="row">
        <label className="field">
          Start (s)
          <input
            type="number"
            min={0}
            max={source.durationMs / 1000}
            step={0.001}
            value={Number((trim.startMs / 1000).toFixed(3))}
            onChange={(event) =>
              audio.setTrim(event.currentTarget.valueAsNumber * 1000, trim.endMs)
            }
          />
        </label>
        <label className="field">
          End (s)
          <input
            type="number"
            min={trim.startMs / 1000}
            max={Math.min(source.durationMs, trim.startMs + 60000) / 1000}
            step={0.001}
            value={Number((trim.endMs / 1000).toFixed(3))}
            onChange={(event) =>
              audio.setTrim(trim.startMs, event.currentTarget.valueAsNumber * 1000)
            }
          />
        </label>
        <button
          type="button"
          onClick={audio.previewing ? audio.stopPreview : () => void audio.preview()}
        >
          {audio.previewing ? "Stop preview" : "Preview trim"}
        </button>
        <button type="button" onClick={() => audio.setTrim(0, Math.min(60000, source.durationMs))}>
          Reset trim
        </button>
      </div>
      <p className="hint">
        {((trim.endMs - trim.startMs) / 1000).toFixed(3)} s selected of{" "}
        {(source.durationMs / 1000).toFixed(3)} s. Patterns start at the trim boundary. The source
        file stays intact; selections are limited to 60 seconds.
      </p>
    </fieldset>
  );
}
