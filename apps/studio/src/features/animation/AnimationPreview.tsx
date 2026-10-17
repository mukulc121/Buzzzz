import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";
import type { useAnimationTrack } from "./useAnimationTrack";
import { AnimationPreviewFrame } from "./AnimationPreviewFrame";

interface IAnimationPreview {
  animation: ReturnType<typeof useAnimationTrack>;
  seekMs?: number;
}

export function AnimationPreview(props: IAnimationPreview) {
  const { animation, seekMs = animation.seekMs } = props;
  const container = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLElement>(null);
  const player = useRef<AnimationItem | null>(null);
  const controls = useRef({ animation, seekMs });
  const data = animation.previewVisible ? animation.source?.data : undefined;
  useEffect(() => {
    controls.current = { animation, seekMs };
  }, [animation, seekMs]);
  useEffect(() => {
    const target = container.current;
    if (!target || !data) return;
    let disposed = false;
    let item: AnimationItem | undefined;
    let lottie: typeof import("lottie-web").default | undefined;
    const resize = () => {
      if (disposed || !target.offsetWidth || !target.offsetHeight || !lottie) return;
      if (item) {
        item.resize();
      } else {
        item = lottie.loadAnimation({
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
      }
    };
    import("lottie-web/build/player/lottie_light_canvas")
      .then((module) => {
        lottie = module.default;
        resize();
      })
      .catch(() => controls.current.animation.onError("The Lottie canvas player could not start"));
    const observer = new ResizeObserver(resize);
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
  if (!animation.source || !animation.previewVisible) return null;
  return (
    <AnimationPreviewFrame
      shell={shell}
      name={animation.source.file.name}
      playing={animation.playing}
      onPlay={() => animation.setPlaying((playing) => !playing)}
      animation={animation}
    >
      <div
        ref={container}
        className="animation-canvas"
        role="img"
        aria-label={`Lottie preview of ${animation.source.file.name}`}
      />
    </AnimationPreviewFrame>
  );
}
