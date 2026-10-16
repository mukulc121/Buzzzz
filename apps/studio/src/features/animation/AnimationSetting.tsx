import { InspectorNumber } from "../../components/InspectorNumber";

interface IAnimationSetting {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}
export function AnimationSetting(props: IAnimationSetting) {
  const { label, value, min, max, step, unit = "", onChange } = props;
  const update = (next: number) => {
    if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
  };
  return (
    <div className="inspector-selection-field animation-setting">
      <div className="inspector-selection-label">
        <span>{label}</span>
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
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => update(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
