import { fromDeepLink, isPairingCode, pairingLink, relayUrl } from "@buzzzz/core";
import { hostedPairingOrigin } from "./hostedPairing";

export function scannedConnection(data: string): string | null {
  const value = data.trim();
  return isPairingCode(value) || pairingLink(value) || fromDeepLink(value) || relayUrl(value)
    ? value
    : null;
}

export function needsConnectionConsent(
  value: string,
  target: URL,
  trusted: ReadonlySet<string>,
  configuredOrigin?: string,
): boolean {
  if (isPairingCode(value.trim()))
    return target.origin !== hostedPairingOrigin(configuredOrigin).origin;
  return !trusted.has(target.origin);
}
