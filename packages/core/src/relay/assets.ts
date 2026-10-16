import { isPairingCode } from "./pairing.ts";
export function isRiveAssetUrl(input: unknown): input is string {
  if (typeof input !== "string" || input.length > 1024) return false;
  if (/^\/riv\/[a-f0-9]+\.riv$/.test(input)) return true;
  try {
    const url = new URL(input);
    const local =
      url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return (
      (url.protocol === "https:" || local) &&
      !url.username &&
      !url.password &&
      !url.hash &&
      /^\/v1\/rooms\/[a-f0-9]{32}\/assets\/[a-f0-9]{32}\.riv$/.test(url.pathname) &&
      /^\?token=[A-Za-z0-9_-]{43}$/.test(url.search)
    );
  } catch {
    return false;
  }
}

export function resolveRiveUrl(path: string, relay: string): string | null {
  if (!isRiveAssetUrl(path)) return null;
  const origin = new URL(relay);
  origin.protocol = origin.protocol === "wss:" ? "https:" : "http:";
  return new URL(path, origin).href;
}

export function pairingLink(
  input: string | null,
): { server: string; room: string; code: string } | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "rivehaptics:" || url.hostname !== "pair") return null;
    const server = new URL(url.searchParams.get("server") ?? "");
    const local =
      server.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(server.hostname);
    const room = url.searchParams.get("room") ?? "";
    const code = url.searchParams.get("code") ?? "";
    if (
      (server.protocol !== "https:" && !local) ||
      server.username ||
      server.password ||
      server.pathname !== "/" ||
      server.search ||
      server.hash ||
      !/^[a-f0-9]{32}$/.test(room) ||
      !isPairingCode(code)
    )
      return null;
    return { server: server.origin, room, code };
  } catch {
    return null;
  }
}
