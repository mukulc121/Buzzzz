import { useState } from "react";
import { patternEnd, type Pattern } from "@buzzzz/core";
import { warpPattern } from "./patternMath";

interface ITimeWarp {
  pattern: Pattern;
  onApply: (pattern: Pattern) => void;
  onError: (message: string) => void;
}

export function TimeWarp(props: ITimeWarp) {
  const [stretch, setStretch] = useState(1);
  const [quantizeMs, setQuantizeMs] = useState(0);
  const [reverse, setReverse] = useState(false);
  const duration = patternEnd(props.pattern) * stretch;
  const apply = () => {
    try {
      props.onApply(warpPattern(props.pattern, { stretch, quantizeMs, reverse }));
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Time warp failed");
    }
  };
  return (
    <div className="panel-content">
      <p>Stretch, quantize, or reverse all three layers.</p>
      <label>
        Stretch {stretch.toFixed(2)}×
        <input
          aria-label="Time stretch"
          type="range"
          min="0.25"
          max="4"
          step="0.05"
          value={stretch}
          onChange={(event) => setStretch(Number(event.target.value))}
        />
      </label>
      <label>
        Quantize
        <select
          aria-label="Time quantization"
          value={quantizeMs}
          onChange={(event) => setQuantizeMs(Number(event.target.value))}
        >
          {[0, 10, 25, 50, 100].map((value) => (
            <option key={value} value={value}>
              {value ? `${value}ms` : "Off"}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={reverse}
          onChange={(event) => setReverse(event.target.checked)}
        />
        Reverse time
      </label>
      <p>New duration {(duration / 1000).toFixed(2)}s. Points landing at the same time merge.</p>
      <button disabled={duration > 60000} onClick={apply}>
        Apply time warp
      </button>
      {duration > 60000 && <p role="status">Reduce stretch to stay within 60 seconds.</p>}
    </div>
  );
}
