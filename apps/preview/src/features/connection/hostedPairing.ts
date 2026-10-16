export function hostedPairingOrigin(
  configured = process.env.EXPO_PUBLIC_PAIRING_ORIGIN ?? "https://buzzzz.theclau.de",
): URL {
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("Invalid hosted pairing origin.");
  }
  const local =
    url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !local) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid hosted pairing origin.");
  return url;
}
