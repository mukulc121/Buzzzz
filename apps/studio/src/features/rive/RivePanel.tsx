import { useEffect, useRef, useState, type RefObject } from "react";
import type { Msg } from "@buzzzz/core";
import { AnimationPreviewFrame } from "../animation/AnimationPreviewFrame";
import { AnimationPreviewIcon } from "../animation/AnimationPreviewIcon";
import type { useAnimationTrack } from "../animation/useAnimationTrack";
import { RiveFullscreenControls } from "./RiveFullscreenControls";

interface IRivePanel {
  riv: { name: string; buffer: ArrayBuffer };
  canvas: RefObject<HTMLCanvasElement | null>;
  animation: ReturnType<typeof useAnimationTrack>;
  restart: () => void;
  send: (message: Msg) => void;
  addLog: (text: string) => void;
  paused: boolean;
  completed: boolean;
  setPause: (paused: boolean) => void;
}

export function RivePanel(props: IRivePanel) {
  const { riv, canvas, animation, restart, send, addLog, paused, completed, setPause } = props;
  const section = useRef<HTMLElement>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const replay = () => {
    restart();
    send({ type: "restart" });
    addLog("Restarted animation");
  };
  const togglePause = () => {
    if (paused && completed) {
      replay();
      return;
    }
    setPause(!paused);
    send({ type: "pause", paused: !paused });
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement === section.current)
      void document.exitFullscreen().catch(() => setFullscreenError("Could not exit fullscreen"));
  };
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === section.current);
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.fullscreenElement !== section.current) return;
      event.preventDefault();
      event.stopPropagation();
      void document.exitFullscreen().catch(() => setFullscreenError("Could not exit fullscreen"));
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", keydown, true);
    };
  }, []);
  return (
    <AnimationPreviewFrame
      shell={section}
      name={riv.name}
      playing={!paused}
      onPlay={togglePause}
      animation={animation}
      className="rive-panel"
      fullscreen={fullscreen}
      actions={
        <button
          type="button"
          aria-label="Fullscreen Rive preview"
          title="Fullscreen Rive preview"
          onClick={() => {
            setFullscreenError("");
            void section.current
              ?.requestFullscreen()
              .catch(() => setFullscreenError("Fullscreen is unavailable in this browser"));
          }}
        >
          <AnimationPreviewIcon name="fullscreen" />
        </button>
      }
    >
      {fullscreenError && (
        <p className="hint" role="status">
          {fullscreenError}
        </p>
      )}
      <div className="animation-canvas stage">
        <canvas ref={canvas} className="rive" aria-label={`Rive preview of ${riv.name}`} />
      </div>
      {fullscreen && (
        <RiveFullscreenControls
          paused={paused}
          onReplay={replay}
          onPause={togglePause}
          onExit={exitFullscreen}
        />
      )}
    </AnimationPreviewFrame>
  );
}
