import type { Pattern } from "@buzzzz/core";
import { GenerationCandidates } from "../generation/GenerationCandidates";
import { AnimationHybridControls } from "./AnimationHybridControls";
import { GenerationTuningControls } from "../audio/GenerationTuningControls";
import { DEFAULT_GENERATION_OPTIONS } from "../audio/tuning";
import { AnimationChannelControls } from "./AnimationChannelControls";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationPanel {
  animation: ReturnType<typeof useAnimationTrack>;
  currentPattern: Pattern;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve?: (pattern: Pattern, label: string) => void;
  onFile: (file: File) => Promise<unknown>;
  onRemove: () => void;
}

export function AnimationPanel(props: IAnimationPanel) {
  const { animation, currentPattern, onApply, onRestore, onPreserve, onFile, onRemove } = props;
  return (
    <section
      className="card animation-panel"
      aria-label="Animation tools"
      aria-busy={animation.working}
    >
      <header className="card-head">
        <h2>Animation</h2>
        <span className="badge">Lottie → haptics</span>
      </header>
      <label className="field">
        Lottie file
        <input
          type="file"
          accept=".json,.lottie,application/json,application/zip+dotlottie"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void onFile(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
      <p className="hint" role="status">
        {animation.loading
          ? "Reading animation…"
          : animation.working
            ? "Sampling animation motion…"
            : animation.source
              ? `${animation.source.file.name} · ${(animation.source.durationMs / 1000).toFixed(2)} s · ${animation.analysis?.frames.length ?? 0} samples`
              : "Choose Lottie JSON or a dotLottie package to preview motion and generate haptics."}
      </p>
      {animation.source && (
        <>
          <div className="row">
            <span className="grow">{animation.source.file.name}</span>
            <button type="button" onClick={onRemove}>
              Remove animation
            </button>
          </div>
          {animation.source.animations.length > 1 && (
            <label className="field">
              Package animation
              <select
                value={animation.source.animationId}
                onChange={(event) => animation.selectAnimation(event.currentTarget.value)}
              >
                {animation.source.animations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset className="audio-controls">
            <legend>Analysis settings</legend>
            <div className="audio-settings-grid">
              <label className="field">
                Samples per second
                <input
                  type="number"
                  min={10}
                  max={500}
                  step={10}
                  value={Number((1000 / animation.frameMs).toFixed(1))}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    if (Number.isFinite(value))
                      animation.setFrameMs(1000 / Math.max(10, Math.min(500, value)));
                  }}
                />
              </label>
              <label className="field">
                Smoothing (ms)
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={animation.smoothingMs}
                  onChange={(event) =>
                    animation.setSmoothingMs(
                      Math.max(0, Math.min(1000, event.currentTarget.valueAsNumber || 0)),
                    )
                  }
                />
              </label>
              <label className="field">
                Playback speed
                <select
                  value={animation.speed}
                  onChange={(event) => animation.setSpeed(Number(event.currentTarget.value))}
                >
                  {[0.25, 0.5, 0.75, 1, 1.5, 2].map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <div className="seg" role="group" aria-label="Animation preview layout">
            {(
              ["stacked", "side-by-side", "fullscreen"] satisfies (typeof animation.previewMode)[]
            ).map((mode) => (
              <button
                type="button"
                key={mode}
                className={animation.previewMode === mode ? "on" : ""}
                aria-pressed={animation.previewMode === mode}
                onClick={() => animation.setPreviewMode(mode)}
              >
                {mode === "side-by-side"
                  ? "Side by side"
                  : mode === "fullscreen"
                    ? "Expanded"
                    : "Stacked"}
              </button>
            ))}
          </div>
          <GenerationTuningControls
            values={animation.generationOptions}
            onChange={(change) =>
              animation.setGenerationOptions((current) => ({ ...current, ...change }))
            }
            onReset={() =>
              animation.setGenerationOptions({ ...DEFAULT_GENERATION_OPTIONS, smoothingMs: 12 })
            }
          />
          <AnimationHybridControls animation={animation} />
          <AnimationChannelControls animation={animation} />
          {animation.source.document.warnings.length > 0 && (
            <ul className="hint animation-warnings">
              {animation.source.document.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          {!animation.working && animation.candidates.length > 0 && (
            <GenerationCandidates
              kind="animation"
              candidates={animation.candidates}
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
