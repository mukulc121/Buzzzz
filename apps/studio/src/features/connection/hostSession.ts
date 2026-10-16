import { isRecord } from "@buzzzz/core";
import { parseRoom, type IRoom } from "./cloud";

const KEY = "buzzzz.hostSession";

export function readHostSession(origin: string): IRoom | null {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (!isRecord(saved) || saved.origin !== origin) return null;
    const room = parseRoom(saved.room);
    if (room.expiresAt <= Date.now()) return null;
    const relay = new URL("/relay", origin);
    relay.protocol = relay.protocol === "https:" ? "wss:" : "ws:";
    relay.searchParams.set("room", room.roomId);
    relay.searchParams.set("token", room.hostToken);
    return { ...room, relayUrl: relay.href };
  } catch {
    return null;
  }
}

export function storeHostSession(origin: string, room: IRoom | null) {
  try {
    if (room) sessionStorage.setItem(KEY, JSON.stringify({ origin, room }));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Shared links retain their own revocation credentials in persistent storage.
  }
}
