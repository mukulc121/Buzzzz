import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationHybridControls {
  animation: ReturnType<typeof useAnimationTrack>;
}
const controls: {
  id: "gain" | "threshold" | "minGapMs" | "freqFollow";
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { id: "gain", label: "Envelope gain", min: 0.5, max: 3, step: 0.1 },
  { id: "threshold", label: "Impact threshold", min: 0.05, max: 0.6, step: 0.01 },
  { id: "minGapMs", label: "Minimum gap (ms)", min: 20, max: 300, step: 10 },
  { id: "freqFollow", label: "Frequency follow", min: 0, max: 1, step: 0.05 },
];

export function AnimationHybridControls(props: IAnimationHybridControls) {
  const { animation } = props;
  return (
    <details className="audio-settings">
      <summary>Hybrid settings</summary>
      <div className="audio-settings-grid">
        {controls.map((control) => (
          <label className="field" key={control.id}>
            <span>
              {control.label} <output>{animation.hybrid[control.id]}</output>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={animation.hybrid[control.id]}
              onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;
                animation.setHybrid((current) => ({ ...current, [control.id]: value }));
              }}
            />
          </label>
        ))}
      </div>
    </details>
  );
}
