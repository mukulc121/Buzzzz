import type { ICanonical } from "./api";

export interface ISyncBase {
  projectId: string;
  revision: number;
  json: string;
}
export type TSyncPlan = "push" | "adopt" | "apply" | "conflict";
export type TSyncStatus = "off" | "paused" | "syncing" | "synced" | "conflict" | "error";

// Decides how a canonical snapshot meets the local document; `base` is the last state both agreed on.
export function planSync(input: {
  canonical: ICanonical;
  localJson: string;
  base: ISyncBase | undefined;
  projectId: string;
}): TSyncPlan {
  const { canonical, localJson, base, projectId } = input;
  if (!canonical.project) return "push";
  // A room that names another local project follows the one open now.
  if (canonical.projectId !== null && canonical.projectId !== projectId) return "push";
  // An unbound room copy is pushed once so the relay records which project it is.
  if (JSON.stringify(canonical.project) === localJson)
    return canonical.projectId === null ? "push" : "adopt";
  if (!base) return "conflict";
  if (base.projectId !== projectId) return "push";
  if (canonical.revision === base.revision || JSON.stringify(canonical.project) === base.json)
    return "push";
  return localJson === base.json ? "apply" : "conflict";
}

export function deriveSyncStatus(input: {
  hasRoom: boolean;
  isWriter: boolean;
  hasConflict: boolean;
  error: string | null;
  pending: boolean;
}): TSyncStatus {
  if (!input.hasRoom) return "off";
  if (!input.isWriter) return "paused";
  if (input.hasConflict) return "conflict";
  if (input.error) return "error";
  return input.pending ? "syncing" : "synced";
}
