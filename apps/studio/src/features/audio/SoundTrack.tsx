import { useState } from "react";
import { X } from "../../components/icons";
import { ToolIcon } from "../../components/ToolIcon";
import { AudioTrimDialog } from "./AudioTrimDialog";
import { SoundSection } from "./SoundSection";
import type { useAudioTrack } from "./useAudioTrack";

interface ISoundTrack {
  audio: ReturnType<typeof useAudioTrack>;
  onRemove: () => void;
}

function durationLabel(milliseconds: number) {
  const seconds = Math.round(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SoundTrack(props: ISoundTrack) {
  const { audio, onRemove } = props;
  const [trimming, setTrimming] = useState(false);
  const { source, trim } = audio;
  if (!source) return null;
  return (
    <>
      <SoundSection title="Track">
        <div className="sound-readonly-row">
          <span>File</span>
          <span title={source.file.name}>{source.file.name}</span>
        </div>
        <div className="sound-readonly-row">
          <span>Length</span>
          <span>{durationLabel(source.durationMs)}</span>
        </div>
        {trim.startMs > 0 && (
          <div className="sound-readonly-row">
            <span>Trimmed</span>
            <span>from {Math.round(trim.startMs)} ms</span>
          </div>
        )}
        <button className="sound-secondary-action" onClick={() => setTrimming(true)}>
          <ToolIcon name="scissors" />
          Open trimming tool
        </button>
        <button
          className="sound-text-action"
          onClick={() => {
            audio.stopPreview();
            onRemove();
          }}
        >
          <X />
          Remove from canvas
        </button>
      </SoundSection>
      {trimming && <AudioTrimDialog audio={audio} onClose={() => setTrimming(false)} />}
    </>
  );
}
