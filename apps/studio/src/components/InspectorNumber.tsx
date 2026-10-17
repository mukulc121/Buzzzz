interface IInspectorNumber {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onBegin?: () => void;
  onChange: (value: number) => void;
  readOnly?: boolean;
}
export function InspectorNumber(props: IInspectorNumber) {
  const { label, value, min, max, step = 1, unit, onBegin, onChange } = props;
  const precision = Math.min(6, step.toString().split(".")[1]?.length ?? 0);
  const increment = (direction: number) => {
    onBegin?.();
    const scale = 10 ** precision;
    onChange(Math.min(max, Math.max(min, Math.round((value + direction * step) * scale) / scale)));
  };
  return (
    <span className="inspector-number" data-unit={Boolean(unit)}>
      <span className="inspector-number-value">
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={precision ? value.toFixed(precision) : value}
          readOnly={props.readOnly}
          onFocus={props.readOnly ? undefined : onBegin}
          onChange={(event) => onChange(event.target.valueAsNumber)}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
      <span className="inspector-number-steppers">
        {([1, -1] as const).map((direction) => (
          <button
            type="button"
            key={direction}
            aria-label={`${direction === 1 ? "Increase" : "Decrease"} ${label.toLowerCase()}`}
            disabled={props.readOnly || (direction === 1 ? value >= max : value <= min)}
            onClick={() => increment(direction)}
          >
            <svg
              width="8"
              height="5"
              viewBox="0 0 8 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <path d={direction === 1 ? "M1 4 4 1l3 3" : "m1 1 3 3 3-3"} />
            </svg>
          </button>
        ))}
      </span>
    </span>
  );
}
