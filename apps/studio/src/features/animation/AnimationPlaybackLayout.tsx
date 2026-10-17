import { InspectorSection } from "../../components/InspectorSection";
import { AnimationPreviewLayout } from "./AnimationPreviewLayout";
import { AnimationSetting } from "./AnimationSetting";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationPlaybackLayout {
  animation: ReturnType<typeof useAnimationTrack>;
}

export function AnimationPlaybackLayout(props: IAnimationPlaybackLayout) {
  const { animation } = props;
  return (
    <>
      <InspectorSection
        title="Playback"
        description="While playing, the scrub marker follows the animation across every timeline and the chart. While paused, drag the marker to scrub to any frame."
      >
        <AnimationSetting
          label="Speed"
          min={0.25}
          max={2}
          step={0.25}
          unit="×"
          value={animation.speed}
          onChange={animation.setSpeed}
        />
      </InspectorSection>
      <AnimationPreviewLayout animation={animation} />
    </>
  );
}
