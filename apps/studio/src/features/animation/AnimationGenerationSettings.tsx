import { DEFAULT_ANIMATION_OPTIONS } from "./generationOptions";
import type { useAnimationTrack } from "./useAnimationTrack";
import { AnimationSetting } from "./AnimationSetting";
import { AnimationInspectorIcon } from "./AnimationInspectorIcon";

interface IAnimationGenerationSettings {
  animation: ReturnType<typeof useAnimationTrack>;
}
const controls: {
  id: keyof typeof DEFAULT_ANIMATION_OPTIONS;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}[] = [
  { id: "contrast", label: "Contrast (anti-mush)", min: 0, max: 1, step: 0.05 },
  { id: "gamma", label: "Gamma (perceptual)", min: 0.3, max: 1, step: 0.05 },
  { id: "silenceFloor", label: "Silence floor", min: 0, max: 0.2, step: 0.005 },
  { id: "transientDuck", label: "Transient ducking", min: 0, max: 0.6, step: 0.05 },
];
export function AnimationGenerationSettings(props: IAnimationGenerationSettings) {
  const { animation } = props;
  return (
    <details className="animation-generation-settings">
      <summary>Generation settings</summary>
      <div className="animation-settings-body">
        <p className="animation-metric-hint">
          Shared by every approach; a change re-runs them. <strong>Sampling rate</strong>{" "}
          oversamples the eased keyframes so quick moves aren't averaged away;{" "}
          <strong>Contrast</strong> suppresses low-level buzz and sharpens hits.
        </p>
        <AnimationSetting
          label="Sampling rate"
          value={Number((1000 / animation.frameMs).toFixed(1))}
          min={60}
          max={480}
          step={30}
          unit="Hz"
          onChange={(value) => animation.setFrameMs(1000 / value)}
        />
        <AnimationSetting
          label="Motion smoothing"
          value={animation.smoothingMs}
          min={0}
          max={40}
          step={2}
          unit="ms"
          onChange={animation.setSmoothingMs}
        />
        {controls.map((control) => (
          <AnimationSetting
            key={control.id}
            {...control}
            value={animation.generationOptions[control.id]}
            onChange={(value) =>
              animation.setGenerationOptions((current) => ({ ...current, [control.id]: value }))
            }
          />
        ))}
        <button
          type="button"
          className="inspector-text-action"
          onClick={() => {
            animation.setFrameMs(1000 / 240);
            animation.setGenerationOptions(DEFAULT_ANIMATION_OPTIONS);
            animation.setStrategyParams({});
            animation.setHybrid({ gain: 1.2, threshold: 0.17, minGapMs: 70, freqFollow: 0.7 });
          }}
        >
          <AnimationInspectorIcon name="reset" />
          Reset to defaults
        </button>
      </div>
    </details>
  );
}
