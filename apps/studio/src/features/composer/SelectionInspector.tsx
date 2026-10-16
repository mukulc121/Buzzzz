import { MAX_PATTERN_MS, type Pattern } from "@buzzzz/core";
import { InspectorIcon } from "../../components/InspectorIcon";
import { InspectorNumber } from "../../components/InspectorNumber";
import type { Selection } from "./model";

interface ISelectionInspector {
  pattern: Pattern;
  selected: Selection;
  durationMs?: number;
  begin: () => void;
  onEdit: (field: string, value: number) => void;
  onDelete?: () => void;
  valueDecimals?: number;
}
export function SelectionInspector(props: ISelectionInspector) {
  const {
    pattern,
    selected,
    durationMs = MAX_PATTERN_MS,
    begin,
    onEdit,
    onDelete,
    valueDecimals = 1,
  } = props;
  const point =
    selected &&
    (selected.layer === "discrete"
      ? pattern.discretePattern[selected.index]
      : pattern.continuousPattern[selected.layer][selected.index]);
  if (!point || !selected)
    return <p className="hint">Select an event or control point on the canvas to edit it.</p>;
  const field = (name: string, label: string, value: number, max: number) => {
    const scale = 10 ** valueDecimals;
    const rounded = name === "time" ? Math.round(value) : Math.round(value * scale) / scale;
    const step = name === "time" ? 1 : 1 / scale;
    const unit = name === "time" ? "ms" : "%";
    return (
      <div className="inspector-selection-field" key={name}>
        <div className="inspector-selection-label">
          <span>{label}</span>
          <InspectorNumber
            label={`Selected ${label.toLowerCase()}`}
            value={rounded}
            min={0}
            max={name === "time" ? MAX_PATTERN_MS : max}
            step={step}
            unit={unit}
            onBegin={begin}
            onChange={(value) => onEdit(name, value)}
          />
        </div>
        <input
          aria-label={`Selected ${label.toLowerCase()} slider`}
          type="range"
          min="0"
          max={max}
          step={step}
          value={rounded}
          onFocus={begin}
          onChange={(event) => onEdit(name, event.target.valueAsNumber)}
        />
      </div>
    );
  };
  return (
    <div className="inspector-selection">
      <p className="inspector-selection-kind">
        {selected.layer === "discrete"
          ? "Discrete event"
          : selected.layer === "amplitude"
            ? "Intensity point"
            : "Frequency point"}
      </p>
      {field(
        "time",
        "Time",
        point.time,
        Math.min(MAX_PATTERN_MS, Math.max(1, durationMs, point.time)),
      )}
      {"value" in point ? (
        field(
          "value",
          selected.layer === "amplitude" ? "Intensity" : "Frequency",
          point.value * 100,
          100,
        )
      ) : (
        <>
          {field("amplitude", "Intensity", point.amplitude * 100, 100)}
          {field("frequency", "Frequency", point.frequency * 100, 100)}
        </>
      )}
      {onDelete && (
        <button className="inspector-delete" type="button" onClick={onDelete}>
          <InspectorIcon name="trash" />
          {selected.layer === "discrete" ? "Delete event" : "Delete point"}
        </button>
      )}
    </div>
  );
}
