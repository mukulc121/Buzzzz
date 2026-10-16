import { isPattern, isProject, isRecord, type Pattern, type Project } from "@buzzzz/core";
type RiveAsset = { name: string; buffer: ArrayBuffer };
type Imported =
  | { kind: "rive"; riv: RiveAsset }
  | { kind: "pattern"; pattern: Pattern; name: string }
  | { kind: "project"; project: Project; riv: RiveAsset | null; stateMachine?: string };
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PROJECT_BYTES = 32 * 1024 * 1024;
function readRive(value: unknown): { riv: RiveAsset | null; stateMachine?: string } {
  if (value == null) return { riv: null };
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.data !== "string" ||
    (value.stateMachine !== undefined && typeof value.stateMachine !== "string")
  )
    throw new Error("Invalid Rive attachment");
  const buffer = Uint8Array.from(atob(value.data), (character) => character.charCodeAt(0)).buffer;
  if (buffer.byteLength > MAX_BYTES || new TextDecoder().decode(buffer.slice(0, 4)) !== "RIVE")
    throw new Error("Invalid Rive attachment");
  return { riv: { name: value.name, buffer }, stateMachine: value.stateMachine };
}
export async function readImport(file: File): Promise<Imported> {
  if (file.name.toLowerCase().endsWith(".riv")) {
    if (file.size > MAX_BYTES) throw new Error("Rive files must be 20 MB or smaller");
    const buffer = await file.arrayBuffer();
    if (new TextDecoder().decode(buffer.slice(0, 4)) !== "RIVE")
      throw new Error("Choose a valid Rive file");
    return { kind: "rive", riv: { name: file.name, buffer } };
  }
  if (file.size > MAX_PROJECT_BYTES) throw new Error("Project files must be 32 MB or smaller");
  const data: unknown = JSON.parse(await file.text());
  if (isPattern(data))
    return { kind: "pattern", pattern: data, name: file.name.replace(/\.json$/i, "") };
  if (!isProject(data)) throw new Error("Choose a valid Pulsar pattern or Buzzzz project file");
  const attachment = readRive("riv" in data ? data.riv : null);
  return { kind: "project", project: { presets: data.presets, map: data.map }, ...attachment };
}
