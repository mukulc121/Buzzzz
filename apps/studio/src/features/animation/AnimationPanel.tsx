import type { Pattern } from "@buzzzz/core";
import { AnimationGenerationCandidates } from "./AnimationGenerationCandidates";
import { X } from "../../components/icons";
import { InspectorSection } from "../../components/InspectorSection";
import { AnimationApproachControls } from "./AnimationApproachControls";
import { AnimationGenerationSettings } from "./AnimationGenerationSettings";
import { AnimationPlaybackLayout } from "./AnimationPlaybackLayout";
import { AnimationInspectorIcon } from "./AnimationInspectorIcon";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationPanel {
  animation: ReturnType<typeof useAnimationTrack>;
  currentPattern: Pattern;
  presetName: string;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve: (pattern: Pattern, label: string) => string | null;
  onFile: (file: File) => Promise<unknown>;
  onRemove: () => void;
  onOpenMedia: () => void;
}

const GENERATION_INFO =
  "Analyzes how the animation's shapes move - velocity, impacts, mass, spins, fades - and derives a haptic pattern from it, several ways at once - as soon as one is attached and again whenever a setting changes. You audition each approach on the chart and keep the one that feels right.";

function durationLabel(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function AnimationPanel(props: IAnimationPanel) {
  const {
    animation,
    currentPattern,
    presetName,
    onApply,
    onRestore,
    onPreserve,
    onFile,
    onRemove,
    onOpenMedia,
  } = props;
  const source = animation.source;
  return (
    <div
      className="animation-panel"
      aria-label="Animation tools"
      role="region"
      aria-busy={animation.working}
    >
      <input
        hidden
        type="file"
        aria-label="Lottie file"
        accept=".json,.lottie,application/json,application/zip+dotlottie"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void onFile(file);
          event.currentTarget.value = "";
        }}
      />
      {source ? (
        <>
          <InspectorSection title="Animation">
            <dl className="animation-track-summary">
              <div>
                <dt>File</dt>
                <dd title={source.file.name}>{source.file.name}</dd>
              </div>
              <div>
                <dt>Length</dt>
                <dd>{durationLabel(source.durationMs)}</dd>
              </div>
              <div>
                <dt>Frames</dt>
                <dd>
                  {Math.round((source.durationMs * source.document.frameRate) / 1000)} ·{" "}
                  {Math.round(source.document.frameRate)} fps
                </dd>
              </div>
            </dl>
            <button type="button" className="inspector-text-action" onClick={onRemove}>
              <X />
              Remove from canvas
            </button>
          </InspectorSection>
          <InspectorSection title="Generate" description={GENERATION_INFO}>
            {animation.working && (
              <p className="animation-analysis-status" role="status">
                <AnimationInspectorIcon name="loading" size={14} />
                Analyzing…
              </p>
            )}
            <AnimationGenerationSettings animation={animation} />
            {animation.analysisError && (
              <>
                <p className="animation-analysis-error" role="alert">
                  <AnimationInspectorIcon name="error" size={14} />
                  {animation.analysisError}
                </p>
                <button
                  type="button"
                  className="sound-secondary-action"
                  onClick={animation.retryAnalysis}
                >
                  <AnimationInspectorIcon name="reset" />
                  Try again
                </button>
              </>
            )}
          </InspectorSection>
          {animation.candidates.length > 0 && (
            <section className="inspector-section">
              <AnimationGenerationCandidates
                candidates={animation.candidates}
                selection={animation.selection}
                currentPattern={currentPattern}
                presetName={presetName}
                onApply={onApply}
                onRestore={onRestore}
                onPreserve={onPreserve}
                renderControls={(candidate) => (
                  <AnimationApproachControls animation={animation} candidate={candidate} />
                )}
              />
            </section>
          )}
          <AnimationPlaybackLayout animation={animation} />
        </>
      ) : (
        <>
          <InspectorSection title="No animation attached">
            <p className="hint">
              Drag and drop a <strong>.json</strong> or <strong>.lottie</strong> file from your
              computer or the Media panel.
            </p>
            <button type="button" className="sound-secondary-action" onClick={onOpenMedia}>
              <AnimationInspectorIcon name="media" />
              Open Media panel
            </button>
          </InspectorSection>
          <InspectorSection title="Generate" description={GENERATION_INFO}>
            <p className="hint">
              Attach an animation and the approaches are derived from it for you.
            </p>
          </InspectorSection>
        </>
      )}
    </div>
  );
}
