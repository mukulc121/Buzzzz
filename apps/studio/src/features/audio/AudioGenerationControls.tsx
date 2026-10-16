import type { IAudioGenerationOptions } from "./model";
import type { useAudioTrack } from "./useAudioTrack";
import { GenerationTuningControls } from "./GenerationTuningControls";
import { DEFAULT_GENERATION_OPTIONS } from "./tuning";

interface IAudioGenerationControls {
  audio: ReturnType<typeof useAudioTrack>;
}
interface IGenerationSetting {
  id: keyof IAudioGenerationOptions;
  label: string;
  min: number;
  max: number;
  step: number;
}
const settings: IGenerationSetting[] = [
  { id: "intensity", label: "Intensity multiplier", min: 0, max: 2, step: 0.05 },
  { id: "frequencyShift", label: "Frequency shift", min: -1, max: 1, step: 0.05 },
  { id: "smoothingMs", label: "Extra smoothing (ms)", min: 0, max: 500, step: 5 },
  {
    id: "reductionTolerance",
    label: "Curve reduction tolerance",
    min: 0.001,
    max: 0.2,
    step: 0.001,
  },
  { id: "minimumTapStrength", label: "Minimum tap strength", min: 0, max: 1, step: 0.05 },
  { id: "maxPoints", label: "Maximum points per envelope", min: 2, max: 10000, step: 1 },
  { id: "maxEvents", label: "Maximum events", min: 0, max: 10000, step: 1 },
];

export function AudioGenerationControls(props: IAudioGenerationControls) {
  const { audio } = props;
  return (
    <>
      <GenerationTuningControls
        values={audio.generationOptions}
        onChange={(change) => audio.setGenerationOptions((current) => ({ ...current, ...change }))}
        onReset={() => audio.setGenerationOptions(DEFAULT_GENERATION_OPTIONS)}
      />
      {
        <details className="audio-settings">
          <summary>Advanced generation settings</summary>
          <div className="audio-settings-grid">
            {settings.map((setting) => (
              <label className="field" key={setting.id}>
                {setting.label}
                <input
                  type="number"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  value={audio.generationOptions[setting.id]}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    if (Number.isFinite(value))
                      audio.setGenerationOptions((current) => ({
                        ...current,
                        [setting.id]: Math.min(setting.max, Math.max(setting.min, value)),
                      }));
                  }}
                />
              </label>
            ))}
          </div>
        </details>
      }
    </>
  );
}
