import { useMemo, useState } from "react";
import { ToolIcon } from "../../components/ToolIcon";
import { DEFAULT_VOICE } from "../audio/voice/pattern";
import { useVoiceSketch } from "./useVoiceSketch";
import { voicePattern } from "./voicePattern";
import { VoiceTake } from "./VoiceTake";
import { VoiceShape } from "./VoiceShape";
import type { IToolSession } from "./model";
import "./voiceSketch.css";

interface IVoiceSketch extends Pick<IToolSession, "onAppend" | "canEdit"> {}

export function VoiceSketch(props: IVoiceSketch) {
  const { onAppend, canEdit } = props;
  const voice = useVoiceSketch();
  const [options, setOptions] = useState(DEFAULT_VOICE);
  const signal = voice.state.kind === "ready" ? voice.state.signal : null;
  const pattern = useMemo(() => (signal ? voicePattern(signal, options) : null), [signal, options]);
  const recording = voice.state.kind === "recording";
  const requesting = voice.state.kind === "requesting";
  const analyzing = voice.state.kind === "analyzing";
  if (!navigator.mediaDevices?.getUserMedia)
    return (
      <div className="tool-empty">
        <ToolIcon name="mic" size={30} />
        <h3>No microphone available</h3>
        <p>Recording needs a microphone and a secure (https) connection.</p>
      </div>
    );
  return (
    <div className="panel-content voice-sketch">
      <section>
        <h3>Record</h3>
        <button
          type="button"
          className="voice-pad"
          data-recording={recording}
          onClick={() => void (recording ? voice.stop() : voice.start())}
          disabled={requesting || analyzing}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {requesting || analyzing ? (
            <svg
              className="voice-spin"
              width={30}
              height={30}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <ToolIcon name={recording ? "stop" : "mic"} size={30} />
          )}
          <span className="voice-pad-label">
            {requesting
              ? "Waiting for the microphone…"
              : analyzing
                ? "Listening back…"
                : recording
                  ? `${(voice.elapsedMs / 1000).toFixed(1)} s - tap to stop`
                  : signal
                    ? "Record again"
                    : "Tap to record"}
          </span>
          {recording && (
            <span className="voice-meter" aria-hidden="true">
              <span style={{ width: `${voice.level * 100}%` }} />
            </span>
          )}
        </button>
        <p className="voice-hint">
          Hum, buzz or shush the shape you want to feel - how loud you are becomes the intensity,
          how high you hum becomes the frequency. Stops itself after 15s.
        </p>
      </section>
      {voice.state.kind === "error" && (
        <p className="voice-error" role="alert">
          {voice.state.message}
        </p>
      )}
      {signal && pattern && (
        <>
          <VoiceTake signal={signal} pattern={pattern} pitch={options.frequency === "pitch"} />
          <VoiceShape options={options} onChange={setOptions} />
          <div className="row">
            <button
              type="button"
              className="primary"
              disabled={!canEdit}
              onClick={() => onAppend(pattern, 0)}
            >
              <ToolIcon name="sparkles" size={16} />
              Generate pattern
            </button>
            <button type="button" className="voice-discard" onClick={voice.cancel}>
              <ToolIcon name="reset" size={16} />
              Discard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
