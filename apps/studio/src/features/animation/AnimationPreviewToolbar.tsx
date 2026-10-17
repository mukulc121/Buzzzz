import type { useAnimationTrack } from "./useAnimationTrack";
import type { ReactNode } from "react";
import type { useFloatingPreview } from "./useFloatingPreview";
import { AnimationPreviewIcon } from "./AnimationPreviewIcon";

interface IAnimationPreviewToolbar {
  name: string;
  playing: boolean;
  onPlay: () => void;
  animation: Pick<
    ReturnType<typeof useAnimationTrack>,
    "previewMode" | "setPreviewMode" | "previewVisible" | "setPreviewVisible"
  >;
  floating: ReturnType<typeof useFloatingPreview>;
  actions?: ReactNode;
}
const layouts = [
  { mode: "side-by-side", label: "Side by side" },
  { mode: "stacked", label: "Stacked" },
  { mode: "floating", label: "Floating preview" },
] as const;
export function AnimationPreviewToolbar(props: IAnimationPreviewToolbar) {
  const { name, playing, onPlay, animation, floating, actions } = props;
  const { position: _position, ...drag } = floating;
  return (
    <header className="animation-preview-header">
      <span
        className="animation-preview-title"
        title={name}
        {...drag}
        role={animation.previewMode === "floating" ? "button" : undefined}
        tabIndex={animation.previewMode === "floating" ? 0 : undefined}
        aria-label={animation.previewMode === "floating" ? `Move ${name} preview` : undefined}
      >
        {name}
      </span>
      <button
        type="button"
        aria-label={playing ? "Pause animation" : "Play animation"}
        title={playing ? "Pause animation" : "Play animation"}
        onClick={onPlay}
      >
        <AnimationPreviewIcon name={playing ? "pause" : "play"} />
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
      {actions}
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
