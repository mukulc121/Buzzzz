import type { Pattern, Project } from "@buzzzz/core";

export interface IRiveAsset {
  name: string;
  buffer: ArrayBuffer;
}
export interface IImportedMedia {
  presetId: string;
  kind: "audio" | "animation";
  file: File;
  window?: { startMs: number; durationMs: number };
}
export type Imported =
  | { kind: "rive"; riv: IRiveAsset }
  | { kind: "audio" | "animation"; file: File }
  | { kind: "pattern"; pattern: Pattern; name: string; warnings?: string[] }
  | {
      kind: "project";
      project: Project;
      riv: IRiveAsset | null;
      stateMachine?: string;
      name?: string;
      media?: IImportedMedia[];
      durations?: Record<string, number>;
    };
export interface IPulsarExport {
  project: Project;
  name?: string;
  id?: string;
  riv?: IRiveAsset | null;
  stateMachine?: string;
  media?: readonly IImportedMedia[];
  durations?: Record<string, number>;
}
