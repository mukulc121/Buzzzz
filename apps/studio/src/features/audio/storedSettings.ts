// Settings Pulsar keeps in localStorage, under the app's own keys.
export function readStored<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable or full; the setting still applies for this session.
  }
}
