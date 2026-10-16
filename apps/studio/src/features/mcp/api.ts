import { isProject, isRecord, type Project } from "@buzzzz/core";
import type { IRoom } from "../connection/cloud";

export interface ICanonical {
  project: Project | null;
  revision: number;
  projectId: string | null;
}
export type TSaveOutcome =
  | { kind: "saved"; revision: number }
  | { kind: "conflict"; canonical: ICanonical };

type TRoomAccess = Pick<IRoom, "roomId" | "hostToken">;

const projectUrl = (origin: string, room: TRoomAccess) =>
  `${origin}/v1/rooms/${room.roomId}/project`;
export const mcpUrl = (origin: string, room: TRoomAccess) =>
  `${origin}/v1/rooms/${room.roomId}/mcp`;

function parseCanonical(value: unknown): ICanonical {
  if (
    !isRecord(value) ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    (value.project !== null && !isProject(value.project)) ||
    (value.projectId !== undefined &&
      value.projectId !== null &&
      typeof value.projectId !== "string")
  )
    throw new Error("The relay returned an invalid project");
  const projectId = typeof value.projectId === "string" ? value.projectId : null;
  return { project: value.project, revision: value.revision, projectId };
}

async function failure(response: Response, fallback: string): Promise<Error> {
  const body: unknown = await response.json().catch(() => null);
  return new Error(isRecord(body) && typeof body.error === "string" ? body.error : fallback);
}

export async function readCanonical(
  origin: string,
  room: TRoomAccess,
  signal: AbortSignal,
): Promise<ICanonical> {
  const response = await fetch(projectUrl(origin, room), {
    headers: { Authorization: `Bearer ${room.hostToken}` },
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await failure(response, "Could not read the room project");
  return parseCanonical(await response.json());
}

export async function writeCanonical(
  origin: string,
  room: TRoomAccess,
  input: { project: Project; baseRevision: number; projectId: string },
  signal: AbortSignal,
): Promise<TSaveOutcome> {
  const response = await fetch(projectUrl(origin, room), {
    method: "PUT",
    headers: { Authorization: `Bearer ${room.hostToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (response.status === 409)
    return { kind: "conflict", canonical: parseCanonical(await response.json()) };
  if (!response.ok) throw await failure(response, "Could not save the room project");
  const saved = parseCanonical(await response.json());
  return { kind: "saved", revision: saved.revision };
}
