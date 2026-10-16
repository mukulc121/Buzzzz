import type { IAudioGenerationOptions } from "./model";
import { DEFAULT_GENERATION_OPTIONS } from "./tuning";

interface IGenerationTuningControls {
  values: IAudioGenerationOptions;
  onChange: (change: IAudioGenerationOptions) => void;
  onReset: () => void;
}
const controls: {
  id: keyof IAudioGenerationOptions;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { id: "contrast", label: "Contrast (anti-mush)", min: 0, max: 1, step: 0.05 },
  { id: "gamma", label: "Gamma", min: 0.3, max: 1, step: 0.05 },
  { id: "silenceFloor", label: "Silence floor", min: 0, max: 0.2, step: 0.005 },
  { id: "transientDuck", label: "Transient ducking", min: 0, max: 0.6, step: 0.05 },
  { id: "envelopeHz", label: "Envelope resolution (Hz)", min: 20, max: 200, step: 10 },
];

export function GenerationTuningControls(props: IGenerationTuningControls) {
  const { values, onChange, onReset } = props;
  return (
    <fieldset className="audio-controls generation-tuning">
      <legend>Generation tuning</legend>
      <div className="audio-settings-grid">
        {controls.map((control) => (
          <label key={control.id} className="field">
            <span>
              {control.label}{" "}
              <output>{values[control.id] ?? DEFAULT_GENERATION_OPTIONS[control.id]}</output>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={values[control.id] ?? DEFAULT_GENERATION_OPTIONS[control.id]}
              onChange={(event) => onChange({ [control.id]: event.currentTarget.valueAsNumber })}
            />
          </label>
        ))}
      </div>
      <button type="button" onClick={onReset}>
        Reset defaults
      </button>
    </fieldset>
  );
}
