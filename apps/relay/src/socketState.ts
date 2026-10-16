import { isRecord } from "@buzzzz/core";

type Role = "host" | "phone";
export interface IConnection {
  role: Role;
  hash: string;
  window: number;
  count: number;
}

export function socketState(socket: WebSocket): IConnection | null {
  const value: unknown = socket.deserializeAttachment();
  if (
    !isRecord(value) ||
    (value.role !== "host" && value.role !== "phone") ||
    typeof value.hash !== "string" ||
    typeof value.window !== "number" ||
    typeof value.count !== "number"
  )
    return null;
  return { role: value.role, hash: value.hash, window: value.window, count: value.count };
}
