import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import type { Rive } from "@rive-app/canvas";
import { createRive } from "./createRive";

type RiveInfo = { triggers: string[]; stateMachines: string[] };
interface ILoadedRive {
  buffer: ArrayBuffer;
  requestedStateMachine: string | undefined;
  stateMachine: string | undefined;
  info: RiveInfo;
}

export function useRive(
  canvas: RefObject<HTMLCanvasElement | null>,
  buffer: ArrayBuffer | null,
  requestedStateMachine: string | undefined,
  onFired: (name: string) => void,
  onError: (message: string) => void,
) {
  const [loaded, setLoaded] = useState<ILoadedRive | null>(null);
  const rive = useRef<Rive | null>(null);
  const fired = useEffectEvent(onFired);
  const reportError = useEffectEvent(onError);
  // Bumping the run id rebuilds the instance: animation from frame 0, fresh view model, listeners re-attached.
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!buffer || !canvas.current) return;
    let active = true;
    let instance: Rive | null = null;
    const observer = new ResizeObserver(() => instance?.resizeDrawingSurfaceToCanvas());
    observer.observe(canvas.current);
    void createRive({
      canvas: canvas.current,
      buffer,
      requestedStateMachine,
      active: () => active,
      onFired: fired,
      onError: reportError,
      onReady: (stateMachine, info) => {
        setPaused(false);
        setLoaded({ buffer, requestedStateMachine, stateMachine, info });
      },
    })
      .then((r) => {
        if (!active) {
          r?.cleanup();
          return;
        }
        instance = r;
        rive.current = r;
      })
      .catch(() => {
        if (active) reportError("The Rive preview could not start");
      });
    return () => {
      active = false;
      observer.disconnect();
      if (rive.current === instance) rive.current = null;
      instance?.cleanup();
    };
  }, [buffer, requestedStateMachine, canvas, run]);

  const fire = (name: string) => rive.current?.viewModelInstance?.trigger(name)?.trigger();
  const restart = () => setRun((n) => n + 1);
  const setPause = (p: boolean) => {
    if (p) rive.current?.pause();
    else rive.current?.play();
    setPaused(p);
  };
  const current =
    loaded?.buffer === buffer && loaded?.requestedStateMachine === requestedStateMachine
      ? loaded
      : null;
  return {
    info: current?.info ?? { triggers: [], stateMachines: [] },
    ready: current !== null,
    stateMachine: current?.stateMachine,
    fire,
    restart,
    paused,
    setPause,
  };
}
