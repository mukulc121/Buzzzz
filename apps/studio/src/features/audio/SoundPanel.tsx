import type { Pattern } from "@buzzzz/core";
import { Upload } from "../../components/icons";
import { AudioAnalysisControls } from "./AudioAnalysisControls";
import { AudioGenerationCandidates } from "./AudioGenerationCandidates";
import { AudioGenerationControls } from "./AudioGenerationControls";
import { GENERATION_INFO } from "./generation/options";
import { SoundSection } from "./SoundSection";
import { SoundTrack } from "./SoundTrack";
import type { useAudioTrack } from "./useAudioTrack";

interface ISoundPanel {
  audio: ReturnType<typeof useAudioTrack>;
  currentPattern: Pattern;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve: (pattern: Pattern, name: string) => void;
  presetName: string;
  onFile: (file: File) => Promise<unknown>;
  onRemove: () => void;
  onOpenMedia: () => void;
}

export function SoundPanel(props: ISoundPanel) {
  const {
    audio,
    currentPattern,
    presetName,
    onApply,
    onRestore,
    onPreserve,
    onFile,
    onRemove,
    onOpenMedia,
  } = props;
  const results = audio.generation.run?.results ?? [];
  return (
    <section className="sound-panel" aria-label="Sound tools" aria-busy={audio.working}>
      <input
        aria-label="Audio file"
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void onFile(file);
          event.currentTarget.value = "";
        }}
      />
      {audio.source ? (
        <>
          <SoundTrack audio={audio} onRemove={onRemove} />
          <AudioAnalysisControls analysis={audio.metrics} loading={audio.decoding} />
          <AudioGenerationControls generation={audio.generation} />
          {results.length > 0 && (
            <AudioGenerationCandidates
              generation={audio.generation}
              results={results}
              currentPattern={currentPattern}
              presetName={presetName}
              onApply={onApply}
              onRestore={onRestore}
              onPreserve={onPreserve}
            />
          )}
        </>
      ) : (
        <>
          <SoundSection title="No audio attached">
            <p className="hint">
              Drag and drop an audio file from your computer or the Media panel.
            </p>
            <button className="sound-secondary-action" onClick={onOpenMedia}>
              <Upload />
              Open Media panel
            </button>
          </SoundSection>
          <SoundSection title="Generate" description={GENERATION_INFO}>
            <p className="hint">Attach a track and the approaches are derived from it for you.</p>
          </SoundSection>
        </>
      )}
    </section>
  );
}
