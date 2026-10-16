import type { Pattern } from "@buzzzz/core";
import { useVoiceSketch } from "./useVoiceSketch";

interface IVoiceSketch {
  onApply: (pattern: Pattern) => void;
  onAdd: (pattern?: Pattern, name?: string) => void;
  onPreview?: (pattern: Pattern) => void;
  onError: (message: string) => void;
}
export function VoiceSketch(props: IVoiceSketch) {
  const voice = useVoiceSketch(props.onError);
  return (
    <div className="panel-content">
      <p>
        Hum or speak for up to 15 seconds. Loudness drives intensity; estimated pitch drives
        frequency. Audio stays in this browser.
      </p>
      <div className="row">
        <button
          disabled={voice.state !== "idle"}
          onClick={() => {
            void voice.start();
          }}
        >
          Record voice sketch
        </button>
        <button disabled={voice.state !== "recording"} onClick={voice.stop}>
          Stop recording
        </button>
        <button disabled={voice.state === "idle"} onClick={voice.cancel}>
          Cancel sketch
        </button>
      </div>
      <p role="status">
        {voice.state === "recording"
          ? `Recording ${(voice.elapsedMs / 1000).toFixed(1)} / 15 seconds`
          : voice.state === "processing"
            ? "Preparing voice sketch…"
            : voice.pattern
              ? "Voice sketch ready"
              : "Microphone access starts only when you press Record."}
      </p>
      {voice.state === "recording" && (
        <label>
          Microphone level
          <meter aria-label="Microphone level" min={0} max={1} value={voice.level} />
        </label>
      )}
      {voice.pattern && (
        <div className="row">
          <button
            onClick={() => {
              if (voice.pattern) props.onApply(voice.pattern);
            }}
          >
            Apply voice sketch
          </button>
          <button
            disabled={!props.onPreview}
            onClick={() => {
              if (voice.pattern) props.onPreview?.(voice.pattern);
            }}
          >
            Preview voice sketch
          </button>
          <button
            onClick={() => {
              if (voice.pattern) props.onAdd(voice.pattern, "Voice sketch");
            }}
          >
            Add voice sketch
          </button>
          <button onClick={voice.cancel}>Reset voice sketch</button>
        </div>
      )}
    </div>
  );
}
