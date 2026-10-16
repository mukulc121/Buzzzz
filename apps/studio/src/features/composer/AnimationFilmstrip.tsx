import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";
import type { IAnimationDocument } from "../animation/model";

interface IAnimationFilmstrip {
  document: IAnimationDocument;
  end: number;
  start: number;
}

export function AnimationFilmstrip(props: IAnimationFilmstrip) {
  const { document: animation, end, start } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    let disposed = false;
    let player: AnimationItem | undefined;
    const aspect = animation.width / Math.max(1, animation.height);
    const host = document.createElement("div");
    host.style.cssText = `position:fixed;left:-10000px;width:${Math.max(1, Math.round(72 * aspect))}px;height:72px;pointer-events:none`;
    host.setAttribute("aria-hidden", "true");
    document.body.append(host);
    const draw = () => {
      const context = target.getContext("2d");
      const frame = host.querySelector("canvas");
      if (disposed || !context || !frame || !player) return;
      const width = target.clientWidth;
      const height = target.clientHeight;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      target.width = Math.round(width * ratio);
      target.height = Math.round(height * ratio);
      context.scale(ratio, ratio);
      const cellWidth = Math.max(20, height * aspect);
      const clipStart = (-start / end) * width;
      const clipEnd = ((animation.durationMs - start) / end) * width;
      const first = Math.max(0, Math.floor((Math.max(0, clipStart) - clipStart) / cellWidth));
      const styles = getComputedStyle(target);
      for (let index = first; index < first + 500; index++) {
        const x = clipStart + index * cellWidth;
        if (x >= Math.min(width, clipEnd)) break;
        const visibleWidth = Math.min(cellWidth, clipEnd - x);
        const time = Math.min(
          animation.durationMs - 1,
          start + ((x + visibleWidth / 2) / Math.max(1, width)) * end,
        );
        const sample = Math.round(Math.max(0, Math.min(1, time / animation.durationMs)) * 23);
        player.goToAndStop(Math.round((sample / 23) * Math.max(0, player.totalFrames - 1)), true);
        context.save();
        context.beginPath();
        context.rect(x, 0, visibleWidth, height);
        context.clip();
        context.drawImage(frame, Math.round(x), 0, cellWidth, height);
        context.restore();
        context.strokeStyle = styles.getPropertyValue("--panel").trim();
        context.globalAlpha = 0.35;
        context.beginPath();
        context.moveTo(Math.round(x), 0);
        context.lineTo(Math.round(x), height);
        context.stroke();
        context.globalAlpha = 1;
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(target);
    void import("lottie-web/build/player/lottie_light_canvas")
      .then((module) => {
        if (disposed) return;
        player = module.default.loadAnimation({
          container: host,
          renderer: "canvas",
          animationData: structuredClone(animation.data),
          autoplay: false,
          loop: false,
          rendererSettings: {
            clearCanvas: true,
            dpr: Math.min(2, window.devicePixelRatio || 1),
            preserveAspectRatio: "xMidYMid meet",
          },
        });
        player.addEventListener("DOMLoaded", draw);
        player.addEventListener("loaded_images", draw);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      observer.disconnect();
      player?.destroy();
      host.remove();
    };
  }, [animation, end, start]);
  return (
    <canvas ref={canvas} role="img" aria-label="Animation frames" className="timeline-filmstrip" />
  );
}
