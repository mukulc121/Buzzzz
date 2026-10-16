import type { Rive } from "@rive-app/canvas";
interface ICreateRive {
  canvas: HTMLCanvasElement;
  buffer: ArrayBuffer;
  requestedStateMachine?: string;
  active: () => boolean;
  onFired: (name: string) => void;
  onError: (message: string) => void;
  onReady: (
    machine: string | undefined,
    info: { triggers: string[]; stateMachines: string[] },
  ) => void;
}
export async function createRive(props: ICreateRive): Promise<Rive | null> {
  const { Rive } = await import("@rive-app/canvas");
  if (!props.active()) return null;
  const r = new Rive({
    buffer: props.buffer.slice(0),
    canvas: props.canvas,
    autoplay: false,
    autoBind: true,
    onLoad: () => {
      if (!props.active()) return;
      const machines = r.stateMachineNames;
      const machine =
        props.requestedStateMachine && machines.includes(props.requestedStateMachine)
          ? props.requestedStateMachine
          : machines[0];
      if (machine) r.reset({ stateMachine: machine, autoplay: false, autoBind: true });
      r.resizeDrawingSurfaceToCanvas();
      const model = r.viewModelInstance;
      const triggers = (model?.properties ?? [])
        .filter((property) => String(property.type) === "trigger")
        .map((property) => property.name);
      for (const name of triggers) model?.trigger(name)?.on(() => props.onFired(name));
      props.onReady(machine, { triggers, stateMachines: machines });
      if (machine || r.animationNames.length) r.play();
    },
    onLoadError: () => {
      if (props.active()) props.onError("This Rive file could not be loaded");
    },
  });
  return r;
}
