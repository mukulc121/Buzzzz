import { fromDeepLink, pairingLink } from "@buzzzz/core";
export function redirectSystemPath(options: { path: string; initial: boolean }) {
  const { path } = options;
  if (pairingLink(path) || fromDeepLink(path) || path.startsWith("rivehaptics:")) return "/";
  return path;
}
