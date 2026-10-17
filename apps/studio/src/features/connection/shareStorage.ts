import { isRecord } from "@buzzzz/core";
import { parseRoom, type IRoom } from "./cloud";

export interface IStoredShare {
  key: string;
  origin: string;
  projectId: string;
  room: IRoom;
  shareId: string;
  url: string;
}
const KEY = "buzzzz.shares";

export function readShares(origin: string | null): Map<string, IStoredShare> {
  const shares = new Map<string, IStoredShare>();
  if (!origin) return shares;
  try {
    const values: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(values)) return shares;
    for (const value of values) {
      try {
        if (
          !isRecord(value) ||
          value.origin !== origin ||
          typeof value.projectId !== "string" ||
          !/^[\w-]{1,64}$/.test(value.projectId) ||
          typeof value.shareId !== "string" ||
          !/^[a-f0-9]{32}$/.test(value.shareId) ||
          typeof value.url !== "string"
        )
          continue;
        const room = parseRoom(value.room);
        const url = new URL(value.url);
        if (
          room.expiresAt <= Date.now() ||
          url.origin !== location.origin ||
          url.searchParams.get("shareRoom") !== room.roomId ||
          url.searchParams.get("shareId") !== value.shareId ||
          !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get("shareToken") ?? "")
        )
          continue;
        const key = `${room.roomId}/${value.projectId}/${value.shareId}`;
        shares.set(key, {
          key,
          origin,
          room,
          projectId: value.projectId,
          shareId: value.shareId,
          url: url.href,
        });
      } catch {
        continue;
      }
    }
  } catch {
    return shares;
  }
  return shares;
}

export function updateShare(origin: string, key: string, share: IStoredShare | null) {
  const shares = readShares(origin);
  if (share) shares.set(key, share);
  else shares.delete(key);
  if (shares.size > 128) throw new Error("Revoke an older share before creating another link.");
  localStorage.setItem(KEY, JSON.stringify([...shares.values()]));
  return shares;
}
