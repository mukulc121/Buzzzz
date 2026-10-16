import type { useAnimationTrack } from "./useAnimationTrack";
import type { useFloatingPreview } from "./useFloatingPreview";
import { AnimationPreviewIcon } from "./AnimationPreviewIcon";

interface IAnimationPreviewToolbar {
  animation: ReturnType<typeof useAnimationTrack>;
  floating: ReturnType<typeof useFloatingPreview>;
}
const layouts = [
  { mode: "side-by-side", label: "Side by side" },
  { mode: "stacked", label: "Stacked" },
  { mode: "floating", label: "Floating preview" },
] as const;
export function AnimationPreviewToolbar(props: IAnimationPreviewToolbar) {
  const { animation, floating } = props;
  const { position: _position, ...drag } = floating;
  return (
    <header className="animation-preview-header">
      <span
        className="animation-preview-title"
        title={animation.source?.file.name}
        {...drag}
        role={animation.previewMode === "floating" ? "button" : undefined}
        tabIndex={animation.previewMode === "floating" ? 0 : undefined}
        aria-label={
          animation.previewMode === "floating"
            ? `Move ${animation.source?.file.name} preview`
            : undefined
        }
      >
        {animation.source?.file.name}
      </span>
      <button
        type="button"
        aria-label={animation.playing ? "Pause animation" : "Play animation"}
        title={animation.playing ? "Pause animation" : "Play animation"}
        onClick={() => animation.setPlaying((playing) => !playing)}
      >
        <AnimationPreviewIcon name={animation.playing ? "pause" : "play"} />
      </button>
      <div className="animation-preview-layouts" role="group" aria-label="Animation preview layout">
        {layouts.map((layout) => (
          <button
            type="button"
            key={layout.mode}
            aria-label={layout.label}
            title={layout.label}
            aria-pressed={animation.previewMode === layout.mode}
            onClick={() => animation.setPreviewMode(layout.mode)}
          >
            <AnimationPreviewIcon name={layout.mode} />
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Hide animation preview"
        title="Hide animation preview"
        onClick={() => animation.setPreviewVisible(false)}
      >
        <AnimationPreviewIcon name="hide" />
      </button>
    </header>
  );
}
