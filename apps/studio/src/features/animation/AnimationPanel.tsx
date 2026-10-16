import type { Pattern } from "@buzzzz/core";
import { AnimationGenerationCandidates } from "./AnimationGenerationCandidates";
import { X } from "../../components/icons";
import { InspectorSection } from "../../components/InspectorSection";
import { AnimationApproachControls } from "./AnimationApproachControls";
import { AnimationGenerationSettings } from "./AnimationGenerationSettings";
import { AnimationFilePicker } from "./AnimationFilePicker";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationPanel {
  animation: ReturnType<typeof useAnimationTrack>;
  currentPattern: Pattern;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve?: (pattern: Pattern, label: string) => void;
  onFile: (file: File) => Promise<unknown>;
  onRemove: () => void;
  onSeek?: (timeMs: number) => void;
}
function durationLabel(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function AnimationPanel(props: IAnimationPanel) {
  const { animation, currentPattern, onApply, onRestore, onPreserve, onFile, onRemove, onSeek } =
    props;
  const source = animation.source;
  return (
    <div
      className="animation-panel"
      aria-label="Animation tools"
      role="region"
      aria-busy={animation.working}
    >
      <InspectorSection title="Animation">
        {source ? (
          <>
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
                  {source.document.frameRate} fps
                </dd>
              </div>
            </dl>
            {source.animations.length > 1 && (
              <label className="field">
                Package animation
                <select
                  value={source.animationId}
                  onChange={(event) => animation.selectAnimation(event.currentTarget.value)}
                >
                  {source.animations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!animation.previewVisible && (
              <button type="button" onClick={() => animation.setPreviewVisible(true)}>
                Show on canvas
              </button>
            )}
            <button type="button" className="inspector-text-action" onClick={onRemove}>
              <X />
              Remove from canvas
            </button>
          </>
        ) : (
          <>
            <AnimationFilePicker onFile={onFile} disabled={animation.loading} />
            <p className="hint">
              Add a Lottie animation to preview it and generate haptics from its motion.
            </p>
          </>
        )}
        {animation.loading && (
          <p className="hint" role="status">
            Reading animation…
          </p>
        )}
      </InspectorSection>
      {source && (
        <>
          <InspectorSection
            title="Generate"
            description="Generate haptics from the animation's motion."
          >
            <AnimationGenerationSettings animation={animation} onSeek={onSeek} />
            {animation.working && (
              <p className="hint" role="status">
                Sampling animation motion…
              </p>
            )}
            {source.document.warnings.length > 0 && (
              <ul className="hint animation-warnings">
                {source.document.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </InspectorSection>
          {animation.candidates.length > 0 && (
            <section className="inspector-section">
              <AnimationGenerationCandidates
                candidates={animation.candidates}
                working={animation.working}
                currentPattern={currentPattern}
                onApply={onApply}
                onRestore={onRestore}
                onPreserve={onPreserve}
                renderControls={(candidate) => (
                  <AnimationApproachControls animation={animation} candidate={candidate} />
                )}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
