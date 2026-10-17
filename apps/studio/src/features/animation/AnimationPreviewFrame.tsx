import type { ReactNode, RefObject } from "react";
import { AnimationPreviewToolbar } from "./AnimationPreviewToolbar";
import { useFloatingPreview } from "./useFloatingPreview";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationPreviewFrame {
  shell: RefObject<HTMLElement | null>;
  name: string;
  playing: boolean;
  onPlay: () => void;
  animation: Pick<
    ReturnType<typeof useAnimationTrack>,
    "previewMode" | "setPreviewMode" | "previewVisible" | "setPreviewVisible"
  >;
  className?: string;
  fullscreen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

export function AnimationPreviewFrame(props: IAnimationPreviewFrame) {
  const {
    shell,
    name,
    playing,
    onPlay,
    animation,
    className = "",
    fullscreen = false,
    actions,
    children,
  } = props;
  const floating = useFloatingPreview({ shell, enabled: animation.previewMode === "floating" });
  return (
    <section
      ref={shell}
      className={`animation-preview ${animation.previewMode} ${className}`}
      hidden={!animation.previewVisible}
      style={fullscreen ? undefined : floating.position}
      aria-label="Animation canvas preview"
      onKeyDown={(event) => {
        if (
          !fullscreen &&
          event.key === "Escape" &&
          ["floating", "fullscreen"].includes(animation.previewMode)
        ) {
          event.stopPropagation();
          animation.setPreviewMode("side-by-side");
        }
      }}
    >
      <AnimationPreviewToolbar
        name={name}
        playing={playing}
        onPlay={onPlay}
        animation={animation}
        floating={floating}
        actions={actions}
      />
      {children}
    </section>
  );
}
