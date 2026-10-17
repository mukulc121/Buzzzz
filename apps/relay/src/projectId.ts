export function isProjectId(value: unknown): value is string {
  return typeof value === "string" && /^[\w-]{1,64}$/.test(value);
}
