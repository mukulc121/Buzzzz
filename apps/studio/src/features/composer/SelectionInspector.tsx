import type { Pattern } from "@buzzzz/core";
import type { Selection } from "./model";

interface ISelectionInspector {
  pattern: Pattern;
  selected: Selection;
  begin: () => void;
  onEdit: (field: string, value: number) => void;
}
export function SelectionInspector(props: ISelectionInspector) {
  const { pattern, selected, begin, onEdit } = props;
  const point =
    selected &&
    (selected.layer === "discrete"
      ? pattern.discretePattern[selected.index]
      : pattern.continuousPattern[selected.layer][selected.index]);
  if (!point)
    return (
      <p className="hint">
        Select a point or drag a box on the chart to edit its position and strength.
      </p>
    );
  const field = (name: string, label: string, value: number, max: number) => (
    <label className="field" key={name}>
      {label}
      <input
        aria-label={`Selected ${label.toLowerCase()}`}
        type="number"
        min="0"
        max={max}
        value={Math.round(value)}
        onFocus={begin}
        onChange={(event) => onEdit(name, +event.target.value)}
      />
      <span className="unit">{name === "time" ? "ms" : "%"}</span>
    </label>
  );
  return (
    <div className="selection-fields">
      {field("time", "Time", point.time, 60000)}
      {"value" in point ? (
        field("value", "Value", point.value * 100, 100)
      ) : (
        <>
          {field("amplitude", "Intensity", point.amplitude * 100, 100)}
          {field("frequency", "Frequency", point.frequency * 100, 100)}
        </>
      )}
    </div>
  );
}
