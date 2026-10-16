import type { IAnimationCandidate } from "./model";
import type { useAnimationTrack } from "./useAnimationTrack";
import { AnimationSetting } from "./AnimationSetting";
import { animationStrategyControls } from "./strategyControls";

interface IAnimationApproachControls {
  animation: ReturnType<typeof useAnimationTrack>;
  candidate: IAnimationCandidate;
}
export function AnimationApproachControls(props: IAnimationApproachControls) {
  const { animation, candidate } = props;
  const values: Record<string, number> =
    candidate.id === "hybrid" ? animation.hybrid : (animation.strategyParams[candidate.id] ?? {});
  return (
    <div
      className="animation-approach-controls"
      role="group"
      aria-label={`${candidate.label} settings`}
    >
      {animationStrategyControls[candidate.id].map((control) => (
        <AnimationSetting
          key={control.id}
          {...control}
          value={values[control.id] ?? control.defaultValue}
          onChange={(value) => {
            if (candidate.id === "hybrid")
              animation.setHybrid((current) => ({ ...current, [control.id]: value }));
            else
              animation.setStrategyParams((current) => ({
                ...current,
                [candidate.id]: { ...current[candidate.id], [control.id]: value },
              }));
          }}
        />
      ))}
    </div>
  );
}
