import { isRecord, parseMessage } from "@buzzzz/core";
import type { IReceivedMedia } from "./mediaModel";

export async function validateMediaDownload(
  packet: IReceivedMedia,
  relayAddress: string,
  request: (input: URL, init?: RequestInit) => Promise<Response> = fetch,
): Promise<void> {
  const parsed = parseMessage(JSON.stringify(packet));
  if (!parsed || (parsed.type !== "audio-haptics" && parsed.type !== "animation-haptics"))
    throw new Error("Studio sent an invalid media address.");
  const clip = parsed.type === "audio-haptics" ? parsed.audio : parsed.animation;
  const address = new URL(clip.downloadUrl);
  const relay = new URL(relayAddress);
  if (relay.protocol !== "ws:" && relay.protocol !== "wss:")
    throw new Error("Studio sent an invalid media address.");
  relay.protocol = relay.protocol === "wss:" ? "https:" : "http:";
  if (address.origin !== relay.origin)
    throw new Error("The media does not belong to this Studio connection.");
  let room = relay.searchParams.get("room");
  if (relay.searchParams.getAll("room").length > 1)
    throw new Error("The Studio connection has an invalid media session.");
  if (!room) {
    const response = await request(new URL("/media/session", relay.origin), { redirect: "error" });
    if (!response.ok) throw new Error("The Studio media session could not be verified.");
    const value: unknown = await response.json();
    if (
      !isRecord(value) ||
      typeof value.roomId !== "string" ||
      !/^[a-f0-9]{32}$/.test(value.roomId)
    )
      throw new Error("The Studio media session could not be verified.");
    room = value.roomId;
  }
  if (!/^[a-f0-9]{32}$/.test(room) || address.pathname.split("/")[3] !== room)
    throw new Error("The media does not belong to this Studio connection.");
}
