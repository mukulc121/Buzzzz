import { useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { compatibilityIssues, type HapticTier } from "./compatibility";

interface ICompatibilityLinter {
  pattern: Pattern;
}
export function CompatibilityLinter(props: ICompatibilityLinter) {
  const [tier, setTier] = useState<HapticTier>("full");
  const issues = compatibilityIssues(props.pattern, tier);
  const choose = (value: string) => {
    if (value === "full" || value === "amplitude" || value === "basic" || value === "none")
      setTier(value);
  };
  return (
    <div className="panel-content">
      <label>
        Device capability
        <select
          aria-label="Haptic device capability"
          value={tier}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="full">Full haptics</option>
          <option value="amplitude">Amplitude only</option>
          <option value="basic">Basic vibration</option>
          <option value="none">No haptics</option>
        </select>
      </label>
      {issues.length ? (
        <ul>
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p>No issues found for this capability tier.</p>
      )}
      <p>Verify the result on the target phone. Hardware limits and platform mixing differ.</p>
    </div>
  );
}
