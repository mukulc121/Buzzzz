import type { Pattern } from "@buzzzz/core";
import { AudioAnalysisControls } from "./AudioAnalysisControls";
import { GenerationCandidates } from "../generation/GenerationCandidates";
import { AudioGenerationControls } from "./AudioGenerationControls";
import { AudioTrimControls } from "./AudioTrimControls";
import type { useAudioTrack } from "./useAudioTrack";

interface ISoundPanel {
  audio: ReturnType<typeof useAudioTrack>;
  currentPattern: Pattern;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve?: (pattern: Pattern, label: string) => void;
  onFile: (file: File) => Promise<unknown>;
  onRemove: () => void;
}

export function SoundPanel(props: ISoundPanel) {
  const { audio, currentPattern, onApply, onRestore, onPreserve, onFile, onRemove } = props;
  return (
    <section className="card audio-panel" aria-label="Sound tools" aria-busy={audio.working}>
      <header className="card-head">
        <h2>Sound</h2>
        <span className="badge">Audio → haptics</span>
      </header>
      <label className="field audio-upload">
        Audio file
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void onFile(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
      <p className="hint" role="status">
        {audio.decoding
          ? "Decoding audio…"
          : audio.working
            ? "Analyzing audio…"
            : audio.source
              ? `${audio.source.file.name} · ${audio.analysis?.frames.length ?? 0} analysis frames${audio.analysis?.tempoBpm ? ` · ${audio.analysis.tempoBpm.toFixed(1)} BPM estimate` : ""}`
              : "Choose an audio file to analyze its signals and generate a haptic pattern."}
      </p>
      {audio.source && (
        <>
          <div className="row">
            <span className="grow">{audio.source.file.name}</span>
            <button
              type="button"
              onClick={() => {
                audio.stopPreview();
                onRemove();
              }}
            >
              Remove audio
            </button>
          </div>
          <AudioTrimControls audio={audio} />
          <AudioAnalysisControls audio={audio} />
          <AudioGenerationControls audio={audio} />
          {!audio.working && audio.candidates.length > 0 && (
            <GenerationCandidates
              kind="audio"
              candidates={audio.candidates}
              currentPattern={currentPattern}
              onApply={onApply}
              onRestore={onRestore}
              onPreserve={onPreserve}
            />
          )}
        </>
      )}
    </section>
  );
}
