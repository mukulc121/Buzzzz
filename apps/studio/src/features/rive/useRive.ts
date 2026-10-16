import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { Rive } from "@rive-app/canvas";

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
) {
  const [loaded, setLoaded] = useState<ILoadedRive | null>(null);
  const rive = useRef<Rive | null>(null);
  const fired = useEffectEvent(onFired);
  // Bumping the run id rebuilds the instance: animation from frame 0, fresh view model, listeners re-attached.
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!buffer || !canvas.current) return;
    let active = true;
    const r = new Rive({
      buffer: buffer.slice(0),
      canvas: canvas.current,
      autoplay: false,
      autoBind: true,
      onLoad: () => {
        if (!active) return;
        const machines = r.stateMachineNames;
        const machine =
          requestedStateMachine && machines.includes(requestedStateMachine)
            ? requestedStateMachine
            : machines[0];
        if (machine) r.reset({ stateMachine: machine, autoplay: false, autoBind: true });
        r.resizeDrawingSurfaceToCanvas();
        setPaused(false);
        const vmi = r.viewModelInstance;
        // ponytail: top-level triggers of the default view model only; nested view models later if needed
        const triggers = (vmi?.properties ?? [])
          .filter((p) => String(p.type) === "trigger")
          .map((p) => p.name);
        triggers.forEach((n) => vmi!.trigger(n)?.on(() => fired(n)));
        setLoaded({
          buffer,
          requestedStateMachine,
          stateMachine: machine,
          info: { triggers, stateMachines: machines },
        });
        if (machine || r.animationNames.length) r.play();
      },
    });
    rive.current = r;
    const observer = new ResizeObserver(() => r.resizeDrawingSurfaceToCanvas());
    observer.observe(canvas.current);
    return () => {
      active = false;
      observer.disconnect();
      if (rive.current === r) rive.current = null;
      r.cleanup();
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
