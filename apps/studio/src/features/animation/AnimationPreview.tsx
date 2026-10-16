import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationPreview {
  animation: ReturnType<typeof useAnimationTrack>;
  seekMs?: number;
  onSeek?: (timeMs: number) => void;
}

export function AnimationPreview(props: IAnimationPreview) {
  const { animation, seekMs = animation.seekMs, onSeek } = props;
  const container = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLElement>(null);
  const player = useRef<AnimationItem | null>(null);
  const controls = useRef({ animation, seekMs });
  const data = animation.source?.data;
  useEffect(() => {
    controls.current = { animation, seekMs };
  }, [animation, seekMs]);
  useEffect(() => {
    const target = container.current;
    if (!target || !data) return;
    let disposed = false;
    let item: AnimationItem | undefined;
    import("lottie-web/build/player/lottie_light_canvas")
      .then((module) => {
        if (disposed) return;
        item = module.default.loadAnimation({
          container: target,
          renderer: "canvas",
          animationData: structuredClone(data),
          loop: true,
          autoplay: false,
          rendererSettings: {
            clearCanvas: true,
            preserveAspectRatio: "xMidYMid meet",
            dpr: Math.min(2, window.devicePixelRatio || 1),
          },
        });
        player.current = item;
        let lastUpdate = 0;
        item.addEventListener("DOMLoaded", () => {
          if (!item) return;
          item.setSpeed(controls.current.animation.speed);
          item.goToAndStop((controls.current.seekMs / 1000) * item.frameRate, true);
          if (controls.current.animation.playing) item.play();
        });
        item.addEventListener("enterFrame", (event) => {
          if (performance.now() - lastUpdate < 33 || !item) return;
          lastUpdate = performance.now();
          controls.current.animation.setPositionMs((event.currentTime / item.frameRate) * 1000);
        });
        item.addEventListener("data_failed", () =>
          controls.current.animation.onError(
            "The Lottie canvas player could not load this animation",
          ),
        );
      })
      .catch(() => controls.current.animation.onError("The Lottie canvas player could not start"));
    const observer = new ResizeObserver(() => player.current?.resize());
    observer.observe(target);
    return () => {
      disposed = true;
      observer.disconnect();
      item?.destroy();
      player.current = null;
    };
  }, [data]);
  useEffect(() => {
    player.current?.setSpeed(animation.speed);
  }, [animation.speed]);
  useEffect(() => {
    if (animation.playing) player.current?.play();
    else player.current?.pause();
  }, [animation.playing]);
  useEffect(() => {
    const item = player.current;
    if (!item) return;
    const frame = (seekMs / 1000) * item.frameRate;
    if (controls.current.animation.playing) item.goToAndPlay(frame, true);
    else item.goToAndStop(frame, true);
  }, [seekMs, animation.seekRevision]);
  if (!animation.source) return null;
  return (
    <section
      ref={shell}
      className={`animation-preview ${animation.previewMode}`}
      aria-label="Animation canvas preview"
    >
      <div
        ref={container}
        className="animation-canvas"
        role="img"
        aria-label={`Lottie preview of ${animation.source.file.name}`}
      />
      <div className="row">
        <button type="button" onClick={() => animation.setPlaying((playing) => !playing)}>
          {animation.playing ? "Pause animation" : "Play animation"}
        </button>
        <label className="field grow">
          Animation position
          <input
            type="range"
            min={0}
            max={animation.source.durationMs}
            step={1}
            value={Math.min(animation.source.durationMs, animation.positionMs)}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              animation.setSeekMs(value);
              onSeek?.(value);
            }}
          />
        </label>
        <output>{(animation.positionMs / 1000).toFixed(2)} s</output>
        <button
          type="button"
          onClick={() => {
            if (shell.current?.requestFullscreen)
              void shell.current
                .requestFullscreen()
                .catch(() =>
                  animation.onError("Fullscreen preview is unavailable in this browser"),
                );
          }}
        >
          Fullscreen
        </button>
        {animation.previewMode === "fullscreen" && (
          <button type="button" onClick={() => animation.setPreviewMode("stacked")}>
            Close expanded preview
          </button>
        )}
      </div>
    </section>
  );
}
