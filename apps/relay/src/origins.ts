export function isStudioOrigin(origin: string | null, configured: string): boolean {
  return origin !== null && configured.split(",").some((value) => value.trim() === origin);
}
