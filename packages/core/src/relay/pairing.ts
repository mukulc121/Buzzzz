export function isPairingCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}
