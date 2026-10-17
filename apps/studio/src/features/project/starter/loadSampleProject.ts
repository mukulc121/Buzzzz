import { readImport } from "../../imports/readImport";
import type { Imported } from "../../imports/model";
import { emptyPattern } from "@buzzzz/core";
import { DEX_RIVE_CONFIG } from "./rive/dex-rive-config";

export async function loadSampleProject(): Promise<Extract<Imported, { kind: "project" }>> {
  const response = await fetch(new URL("./starting-demo-project.pulsar", import.meta.url));
  if (!response.ok) throw new Error("The sample project could not be loaded. Try again.");
  const project = await readImport(
    new File([await response.arrayBuffer()], "starting-demo-project.pulsar", {
      type: "application/zip",
    }),
  );
  if (project.kind !== "project") throw new Error("The sample project archive is invalid.");
  const rive = await fetch(new URL("./rive/dexHeadoutIntegration.riv", import.meta.url));
  if (!rive.ok) throw new Error("The Rive sample could not be loaded. Try again.");
  return {
    ...project,
    project: {
      ...project.project,
      presets: [
        ...project.project.presets,
        { id: "dex-tour-loader", name: "DexTourLoader", pattern: emptyPattern() },
      ],
      riveStateMachine: "stateMachine",
      riveConfig: structuredClone(DEX_RIVE_CONFIG),
    },
    riv: { name: "dexHeadoutIntegration.riv", buffer: await rive.arrayBuffer() },
    stateMachine: "stateMachine",
  };
}
