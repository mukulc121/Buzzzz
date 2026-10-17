import { InspectorSection } from "../../components/InspectorSection";
import { AnimationInspectorIcon } from "./AnimationInspectorIcon";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationPreviewLayout {
  animation: Pick<
    ReturnType<typeof useAnimationTrack>,
    "previewMode" | "setPreviewMode" | "previewVisible" | "setPreviewVisible"
  >;
}

const layouts = [
  { mode: "side-by-side", label: "Side by side" },
  { mode: "stacked", label: "Stacked" },
  { mode: "floating", label: "Floating window" },
] as const;

export function AnimationPreviewLayout(props: IAnimationPreviewLayout) {
  const { animation } = props;
  return (
    <InspectorSection title="Layout" description="Where the preview sits relative to the chart.">
      <div className="animation-inspector-layout" role="group" aria-label="Animation layout">
        {layouts.map((layout) => (
          <button
            type="button"
            key={layout.mode}
            aria-label={layout.label}
            title={layout.label}
            aria-pressed={animation.previewMode === layout.mode}
            onClick={() => animation.setPreviewMode(layout.mode)}
          >
            <AnimationInspectorIcon name={layout.mode} />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="inspector-text-action"
        onClick={() => animation.setPreviewVisible(!animation.previewVisible)}
      >
        <AnimationInspectorIcon name={animation.previewVisible ? "hide" : "show"} />
        {animation.previewVisible ? "Hide preview" : "Show preview"}
      </button>
    </InspectorSection>
  );
}
