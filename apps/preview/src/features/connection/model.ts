import { isRecord } from "@buzzzz/core";
import { phoneRelayUrl, type IPhoneConnection } from "./pairing";

export type RelayStatus = "idle" | "connecting" | "connected" | "error";

export interface IStoredConnection extends IPhoneConnection {
  id: string;
}

export interface IRelayConnection extends IStoredConnection {
  status: RelayStatus;
  error: string | null;
}

let sequence = 0;

function connectionIdentity(input: string): string {
  const url = phoneRelayUrl(input);
  if (url.searchParams.has("room")) url.searchParams.delete("token");
  url.searchParams.sort();
  return url.href;
}

export function storedConnection(
  connections: readonly IStoredConnection[],
  connection: IPhoneConnection,
): IStoredConnection {
  const identity = connectionIdentity(connection.url);
  const previous = connections.find((item) => connectionIdentity(item.url) === identity);
  return {
    ...connection,
    url: phoneRelayUrl(connection.url).href,
    id: previous?.id ?? `conn-${Date.now().toString(36)}-${sequence++}`,
  };
}

export function decodeConnections(text: string | null): IStoredConnection[] {
  if (!text) return [];
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const records = new Map<string, IStoredConnection>();
  const identities = new Set<string>();
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      item.id.length > 512 ||
      typeof item.label !== "string" ||
      !item.label ||
      item.label.length > 512 ||
      typeof item.url !== "string" ||
      item.url.length > 8192 ||
      (item.expiresAt !== undefined &&
        (typeof item.expiresAt !== "number" ||
          !Number.isFinite(item.expiresAt) ||
          item.expiresAt <= 0))
    )
      continue;
    try {
      const url = phoneRelayUrl(item.url);
      const identity = connectionIdentity(url.href);
      if (records.has(item.id) || identities.has(identity)) continue;
      identities.add(identity);
      records.set(item.id, {
        id: item.id,
        url: url.href,
        label: item.label,
        ...(item.expiresAt === undefined ? {} : { expiresAt: item.expiresAt }),
      });
    } catch {}
  }
  return [...records.values()];
}
