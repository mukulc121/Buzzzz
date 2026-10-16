import { connectionTarget } from "./connectionTarget";
import { fromDeepLink, isPairingCode, isRecord, pairingLink, relayUrl } from "@buzzzz/core";

export interface IPhoneConnection {
  url: string;
  label: string;
  expiresAt?: number;
}

export async function resolvePhoneConnection(props: {
  input: string;
  device: string;
  signal?: AbortSignal;
  pairingOrigin?: string;
}): Promise<IPhoneConnection> {
  const { device, signal } = props;
  const input = props.input.trim();
  const target = connectionTarget(input, props.pairingOrigin);
  const pairing = pairingLink(input);
  const numeric = isPairingCode(input);
  if (!pairing && !numeric) {
    const direct = relayUrl(fromDeepLink(input) ?? input);
    if (!direct) throw new Error("Paste a Studio pairing link or a ws:// relay address.");
    return { url: direct.href, label: direct.host };
  }
  const server = pairing ? new URL(pairing.server) : target;
  const path = pairing ? `/v1/rooms/${pairing.room}/pair` : "/v1/pair";
  const response = await fetch(new URL(path, server), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: pairing ? pairing.code : input, device }),
    signal,
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "This pairing code expired or was already used. Generate a new one in Studio."
        : "Could not pair with Studio. Check the link and try again.",
    );
  const value: unknown = await response.json();
  if (
    !isRecord(value) ||
    typeof value.phoneToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.phoneToken) ||
    typeof value.expiresAt !== "number" ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= Date.now() ||
    typeof value.relayUrl !== "string"
  )
    throw new Error("Studio returned an invalid pairing response.");
  const room = pairing ? pairing.room : value.roomId;
  if (typeof room !== "string" || !/^[a-f0-9]{32}$/.test(room))
    throw new Error("Studio returned an invalid pairing response.");
  const url = relayUrl(value.relayUrl);
  if (
    !url ||
    url.host !== server.host ||
    url.protocol !== (server.protocol === "https:" ? "wss:" : "ws:") ||
    url.searchParams.getAll("room").length !== 1 ||
    url.searchParams.get("room") !== room ||
    url.searchParams.getAll("token").length !== 1 ||
    url.searchParams.get("token") !== value.phoneToken
  )
    throw new Error("Studio returned an invalid relay address.");
  return { url: url.href, label: server.host, expiresAt: value.expiresAt };
}

export function phoneRelayUrl(input: string): URL {
  connectionTarget(input);
  const url = relayUrl(input);
  if (!url) throw new Error("Invalid relay address.");
  if (url.searchParams.has("token")) url.searchParams.delete("role");
  else url.searchParams.set("role", "phone");
  return url;
}
