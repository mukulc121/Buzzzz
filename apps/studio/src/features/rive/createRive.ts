import type { Rive } from "@rive-app/canvas";
import type { IRiveConfig } from "@buzzzz/core";
import wasmUrl from "@rive-app/canvas/rive.wasm?url";
import fallbackWasmUrl from "@rive-app/canvas/rive_fallback.wasm?url";
interface ICreateRive {
  canvas: HTMLCanvasElement;
  buffer: ArrayBuffer;
  requestedStateMachine?: string;
  config?: IRiveConfig;
  active: () => boolean;
  onFired: (name: string) => void;
  onError: (message: string) => void;
  onReady: (
    machine: string | undefined,
    info: { triggers: string[]; stateMachines: string[] },
  ) => boolean;
}
export async function createRive(props: ICreateRive): Promise<Rive | null> {
  const { Rive, RuntimeLoader } = await import("@rive-app/canvas");
  if (!props.active()) return null;
  RuntimeLoader.setWasmUrl(wasmUrl);
  RuntimeLoader.setWasmFallbackUrl(fallbackWasmUrl);
  const r = new Rive({
    buffer: props.buffer.slice(0),
    canvas: props.canvas,
    artboard: props.config?.artboard,
    autoplay: false,
    autoBind: true,
    onLoad: () => {
      if (!props.active()) return;
      const machines = r.stateMachineNames;
      const machine =
        props.requestedStateMachine && machines.includes(props.requestedStateMachine)
          ? props.requestedStateMachine
          : machines[0];
      if (machine)
        r.reset({
          stateMachine: machine,
          artboard: props.config?.artboard,
          autoplay: false,
          autoBind: true,
        });
      if (props.config?.viewModel) {
        const definition = r.viewModelByName(props.config.viewModel);
        if (!definition) {
          props.onError(`The Rive file has no ${props.config.viewModel} view model`);
          return;
        }
        r.bindViewModelInstance(definition.defaultInstance() ?? definition.instance());
      }
      r.resizeDrawingSurfaceToCanvas();
      const model = r.viewModelInstance;
      const triggers = (model?.properties ?? [])
        .filter((property) => String(property.type) === "trigger")
        .map((property) => property.name);
      for (const name of triggers)
        model?.trigger(name)?.on(() => {
          if (props.active()) props.onFired(name);
        });
      const autoplay = props.onReady(machine, { triggers, stateMachines: machines });
      if (autoplay && (machine || r.animationNames.length)) r.play();
    },
    onLoadError: () => {
      if (props.active()) props.onError("This Rive file could not be loaded");
    },
  });
  return r;
}
