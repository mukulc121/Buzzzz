import { DEFAULT_ANIMATION_OPTIONS } from "./generationOptions";
import type { useAnimationTrack } from "./useAnimationTrack";
import { AnimationSetting } from "./AnimationSetting";
import { AnimationPreviewIcon } from "./AnimationPreviewIcon";

interface IAnimationGenerationSettings {
  animation: ReturnType<typeof useAnimationTrack>;
  onSeek?: (timeMs: number) => void;
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
  const { animation, onSeek } = props;
  return (
    <details className="animation-generation-settings">
      <summary>Generation settings</summary>
      <div className="animation-settings-body">
        <AnimationSetting
          label="Sampling rate"
          value={Number((1000 / animation.frameMs).toFixed(1))}
          min={60}
          max={480}
          step={30}
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
          onClick={() => animation.setGenerationOptions(DEFAULT_ANIMATION_OPTIONS)}
        >
          Reset defaults
        </button>
        <label className="field animation-speed">
          Playback speed
          <select
            aria-label="Playback speed"
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
        <label className="field animation-position">
          Animation position
          <input
            type="range"
            aria-label="Animation position"
            min={0}
            max={animation.source?.durationMs ?? 0}
            step={1}
            value={Math.min(animation.source?.durationMs ?? 0, animation.positionMs)}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (onSeek) onSeek(value);
              else animation.setSeekMs(value);
            }}
          />
          <output>{(animation.positionMs / 1000).toFixed(2)} s</output>
        </label>
        <button
          type="button"
          className="inspector-text-action"
          onClick={() => {
            animation.setPreviewVisible(true);
            animation.setPreviewMode("fullscreen");
          }}
        >
          <AnimationPreviewIcon name="fullscreen" />
          Fullscreen preview
        </button>
      </div>
    </details>
  );
}
