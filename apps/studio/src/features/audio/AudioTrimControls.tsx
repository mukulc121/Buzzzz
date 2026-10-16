import { useState } from "react";
import { Play, Stop } from "../../components/icons";
import { InspectorNumber } from "../../components/InspectorNumber";
import { AudioTrimWaveform } from "./AudioTrimWaveform";
import { constrainTrimDraft } from "./trimDraft";
import { useAudioPreview } from "./useAudioPreview";
import type { useAudioTrack } from "./useAudioTrack";

interface IAudioTrimControls {
  audio: ReturnType<typeof useAudioTrack>;
  onClose: () => void;
}

export function AudioTrimControls(props: IAudioTrimControls) {
  const { audio, onClose } = props;
  const { source, trim } = audio;
  const [draft, setDraft] = useState(trim);
  const [error, setError] = useState<string | null>(null);
  const preview = useAudioPreview(source?.url, draft.startMs, draft.endMs, setError);
  if (!source) return null;
  const update = (startMs: number, endMs: number) => {
    if (Number.isFinite(startMs) && Number.isFinite(endMs))
      setDraft(constrainTrimDraft({ startMs, endMs }, source.durationMs));
  };
  const changed = draft.startMs !== trim.startMs || draft.endMs !== trim.endMs;
  return (
    <div className="sound-trim-controls">
      <h3 title={source.file.name}>{source.file.name}</h3>
      <AudioTrimWaveform source={source.decoded} trim={draft} onChange={update} />
      <div className="sound-trim-times">
        <span>0 ms</span>
        <span>{Math.round(source.durationMs)} ms</span>
      </div>
      <div className="sound-trim-field">
        <span>Start</span>
        <InspectorNumber
          label="Start"
          value={draft.startMs}
          min={0}
          max={source.durationMs}
          step={1}
          unit="ms"
          onChange={(value) => update(value, draft.endMs)}
        />
      </div>
      <div className="sound-trim-field">
        <span>End</span>
        <InspectorNumber
          label="End"
          value={draft.endMs}
          min={draft.startMs}
          max={Math.min(source.durationMs, draft.startMs + 60000)}
          step={1}
          unit="ms"
          onChange={(value) => update(draft.startMs, value)}
        />
      </div>
      <p className="hint">
        Duration: <strong>{Math.round(draft.endMs - draft.startMs)} ms</strong>
      </p>
      <div className="sound-trim-actions">
        <button
          className="sound-secondary-action"
          disabled={!changed}
          onClick={() => {
            audio.setTrim(draft.startMs, draft.endMs);
            onClose();
          }}
        >
          Apply trim
        </button>
        <button
          className="sound-secondary-action"
          onClick={preview.previewing ? preview.stopPreview : () => void preview.preview()}
        >
          {preview.previewing ? <Stop /> : <Play />}
          {preview.previewing ? "Stop preview" : "Preview"}
        </button>
      </div>
      <button
        className="sound-text-action"
        onClick={() => update(0, Math.min(60000, source.durationMs))}
      >
        Whole file
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
