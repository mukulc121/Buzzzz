import { isRecord, isRiveAssetUrl } from "@buzzzz/core";

export interface IRoom {
  roomId: string;
  hostToken: string;
  expiresAt: number;
  pairing: { code: string; expiresAt: number };
  relayUrl: string;
}
export const cloudOrigin = () => {
  const configured = import.meta.env.VITE_RELAY_URL;
  if (typeof configured !== "string" || !configured) return null;
  try {
    const url = new URL(configured);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
};
export function parseRoom(value: unknown): IRoom {
  if (
    !isRecord(value) ||
    typeof value.roomId !== "string" ||
    !/^[a-f0-9]{32}$/.test(value.roomId) ||
    typeof value.hostToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.hostToken) ||
    typeof value.expiresAt !== "number" ||
    !Number.isFinite(value.expiresAt) ||
    !isRecord(value.pairing) ||
    typeof value.pairing.code !== "string" ||
    !/^\d{6}$/.test(value.pairing.code) ||
    typeof value.pairing.expiresAt !== "number" ||
    !Number.isFinite(value.pairing.expiresAt) ||
    typeof value.relayUrl !== "string"
  )
    throw new Error("Invalid room response");
  return {
    roomId: value.roomId,
    hostToken: value.hostToken,
    expiresAt: value.expiresAt,
    pairing: { code: value.pairing.code, expiresAt: value.pairing.expiresAt },
    relayUrl: value.relayUrl,
  };
}
export async function createRoom(origin: string, signal: AbortSignal): Promise<IRoom> {
  const response = await fetch(`${origin}/v1/rooms`, { method: "POST", signal });
  if (!response.ok) throw new Error("Could not create a private pairing room");
  return parseRoom(await response.json());
}
export async function uploadRive(
  buffer: ArrayBuffer,
  room: IRoom | null,
  signal?: AbortSignal,
): Promise<string> {
  const origin = cloudOrigin();
  const response = await fetch(
    room && origin ? `${origin}/v1/rooms/${room.roomId}/assets?kind=rive` : "/riv",
    {
      method: "POST",
      headers: room
        ? { Authorization: `Bearer ${room.hostToken}`, "Content-Type": "application/octet-stream" }
        : {},
      body: buffer,
      signal,
    },
  );
  if (!response.ok) throw new Error(await response.text());
  const data: unknown = await response.json();
  if (!isRecord(data) || !isRiveAssetUrl(data.path)) throw new Error("Invalid upload response");
  return data.path;
}
