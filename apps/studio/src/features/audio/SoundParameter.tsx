import { InspectorNumber } from "../../components/InspectorNumber";
import { SoundInfo } from "./SoundSection";

interface ISoundParameter {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
}

export function SoundParameter(props: ISoundParameter) {
  const { label, value, min, max, step = 1, unit = "", description, onChange } = props;
  const update = (next: number) => {
    if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <div className="sound-parameter inspector-selection-field">
      <div className="sound-parameter-label">
        <span>
          {label}
          {description && <SoundInfo description={description} />}
        </span>
        <InspectorNumber
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          unit={unit}
          onChange={update}
        />
      </div>
      <input
        aria-label={`${label} slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => update(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
