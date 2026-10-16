import { readImport } from "../../imports/readImport";
import type { Imported } from "../../imports/model";

export async function loadSampleProject(): Promise<Extract<Imported, { kind: "project" }>> {
  const response = await fetch(new URL("./starting-demo-project.pulsar", import.meta.url));
  if (!response.ok) throw new Error("The sample project could not be loaded. Try again.");
  const project = await readImport(
    new File([await response.arrayBuffer()], "starting-demo-project.pulsar", {
      type: "application/zip",
    }),
  );
  if (project.kind !== "project") throw new Error("The sample project archive is invalid.");
  return project;
}
