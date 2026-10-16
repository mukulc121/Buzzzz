import { isRecord } from "@buzzzz/core";
import { phoneRelayUrl, type IPhoneConnection } from "./pairing";

export type RelayStatus = "idle" | "connecting" | "connected" | "error";

export interface IStoredConnection extends IPhoneConnection {
  id: string;
  customName?: string;
  createdAt?: number;
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
    createdAt: previous?.createdAt ?? Date.now(),
    ...(previous?.customName ? { customName: previous.customName } : {}),
  };
}

export function connectionDisplayName(
  connection: Pick<IStoredConnection, "label" | "customName">,
): string {
  return connection.customName?.trim() || connection.label;
}

export function renamedConnection<T extends IStoredConnection>(connection: T, input: string): T {
  const customName = input.trim() || undefined;
  if (customName && customName.length > 512)
    throw new Error("Connection names must be 512 characters or fewer.");
  return customName === connection.customName ? connection : { ...connection, customName };
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
      (item.customName !== undefined &&
        (typeof item.customName !== "string" || item.customName.length > 512)) ||
      (item.createdAt !== undefined &&
        (typeof item.createdAt !== "number" ||
          !Number.isFinite(item.createdAt) ||
          item.createdAt < 0)) ||
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
        ...(item.customName === undefined ? {} : { customName: item.customName }),
        ...(item.createdAt === undefined ? {} : { createdAt: item.createdAt }),
        ...(item.expiresAt === undefined ? {} : { expiresAt: item.expiresAt }),
      });
    } catch {}
  }
  return [...records.values()];
}
