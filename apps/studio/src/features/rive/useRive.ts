import {
  useCallback,
  useLayoutEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Rive } from "@rive-app/canvas";
import type { IRiveConfig } from "@buzzzz/core";
import { createRive } from "./createRive";

type RiveInfo = { triggers: string[]; stateMachines: string[] };
type TRivePlayback = "loading" | "playing" | "paused" | "suspended" | "completed";
interface ILoadedRive {
  scene: TRiveScene;
  stateMachine: string | undefined;
  started: boolean;
  info: RiveInfo;
}
type TRiveScene = Pick<IRive, "buffer" | "requestedStateMachine" | "config" | "active"> & {
  run: number;
};
interface IRive {
  canvas: RefObject<HTMLCanvasElement | null>;
  buffer: ArrayBuffer | null;
  requestedStateMachine: string | undefined;
  config: IRiveConfig | undefined;
  active: boolean;
  onFired: (name: string) => void;
  onError: (message: string) => void;
  onStop: () => void;
  onFinish: () => void;
  onPause: (paused: boolean) => void;
}
export function useRive(props: IRive) {
  const {
    canvas,
    buffer,
    requestedStateMachine,
    config,
    active,
    onFired,
    onError,
    onStop,
    onFinish,
    onPause,
  } = props;
  const [loaded, setLoaded] = useState<ILoadedRive | null>(null);
  const rive = useRef<Rive | null>(null);
  const fired = useEffectEvent(onFired);
  const reportError = useEffectEvent(onError);
  const stopHaptics = useEffectEvent(onStop);
  const pauseHaptics = useEffectEvent(onPause);
  // Bumping the run id rebuilds the instance: animation from frame 0, fresh view model, listeners re-attached.
  const [run, setRun] = useState(0);
  const [playback, setPlayback] = useState<TRivePlayback>("loading");
  const phase = useRef<TRivePlayback>("loading");
  const updatePlayback = useCallback((next: TRivePlayback) => {
    phase.current = next;
    setPlayback(next);
  }, []);
  const acceptsTriggers = useCallback(() => phase.current === "playing", []);
  const scene = useMemo(
    () => ({ buffer, requestedStateMachine, config, active, run }),
    [buffer, requestedStateMachine, config, active, run],
  );

  useLayoutEffect(() => {
    phase.current = "loading";
    const { buffer, requestedStateMachine, config, active } = scene;
    if (!active || !buffer || !canvas.current) return;
    let alive = true;
    let instance: Rive | null = null;
    const observer = new ResizeObserver(() => instance?.resizeDrawingSurfaceToCanvas());
    observer.observe(canvas.current);
    void createRive({
      canvas: canvas.current,
      buffer,
      requestedStateMachine,
      config,
      active: () => alive,
      onFired: fired,
      onError: reportError,
      onReady: (stateMachine, info) => {
        const autoplay = document.visibilityState === "visible";
        updatePlayback(autoplay ? "playing" : "suspended");
        if (!autoplay) pauseHaptics(true);
        setLoaded({ scene, stateMachine, info, started: autoplay });
        return autoplay;
      },
    })
      .then((r) => {
        if (!alive) {
          r?.cleanup();
          return;
        }
        instance = r;
        rive.current = r;
      })
      .catch(() => {
        if (alive) reportError("The Rive preview could not start");
      });
    return () => {
      alive = false;
      stopHaptics();
      observer.disconnect();
      if (rive.current === instance) rive.current = null;
      instance?.cleanup();
    };
  }, [scene, canvas, updatePlayback]);

  const fire = (name: string) => rive.current?.viewModelInstance?.trigger(name)?.trigger();
  const restart = () => {
    updatePlayback("loading");
    onStop();
    setRun((n) => n + 1);
  };
  const pause = (phase: "paused" | "suspended") => {
    updatePlayback(phase);
    rive.current?.pause();
    onPause(true);
  };
  const setPause = (paused: boolean) => {
    if (paused) pause("paused");
    else if (loaded?.scene === scene && !loaded.started) restart();
    else {
      updatePlayback("playing");
      onPause(false);
      rive.current?.play();
    }
  };
  const finish = () => {
    updatePlayback("completed");
    onFinish();
    rive.current?.pause();
  };
  const current = active && loaded?.scene === scene ? loaded : null;
  return {
    info: current?.info ?? { triggers: [], stateMachines: [] },
    ready: current !== null,
    acceptsTriggers,
    stateMachine: current?.stateMachine,
    fire,
    restart,
    paused: playback !== "playing",
    publishable: playback === "playing" || playback === "completed",
    suspend: () => pause("suspended"),
    setPause,
    finish,
  };
}
