import { fromDeepLink, isPairingCode, pairingLink, relayUrl } from "@buzzzz/core";
import { hostedPairingOrigin } from "./hostedPairing";

function privateIpv4(parts: number[]) {
  const [a, b] = parts;
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}
function localHost(host: string) {
  if (host === "localhost" || host === "localhost.") return true;
  if (host.startsWith("[")) {
    const address = host.slice(1, -1).toLowerCase();
    if (address === "::1" || /^(f[cd][0-9a-f]{2}|fe[89ab][0-9a-f]):/.test(address)) return true;
    const mapped = /^::ffff:([a-f\d]+):([a-f\d]+)$/.exec(address);
    if (!mapped) return false;
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    return privateIpv4([high >> 8, high & 255, low >> 8, low & 255]);
  }
  const parts = host.split(".").map(Number);
  return (
    parts.length === 4 &&
    parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
    privateIpv4(parts)
  );
}
export function connectionTarget(input: string, pairingOrigin?: string): URL {
  if (isPairingCode(input.trim())) return hostedPairingOrigin(pairingOrigin);
  const pairing = pairingLink(input);
  const target = pairing ? new URL(pairing.server) : relayUrl(fromDeepLink(input) ?? input);
  if (!target) throw new Error("Paste a Studio pairing link or a ws:// relay address.");
  if (["ws:", "http:"].includes(target.protocol) && !localHost(target.hostname))
    throw new Error(
      "Use a private IP address or localhost for local WS connections. Remote servers require WSS.",
    );
  return target;
}
