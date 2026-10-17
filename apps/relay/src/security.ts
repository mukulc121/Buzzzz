export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function randomId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function randomPairCode(): string {
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0]! >= 4_294_000_000);
  return String(bytes[0]! % 1_000_000).padStart(6, "0");
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function tokenHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function tokenMatches(value: string, expected: string): Promise<boolean> {
  const actual = new TextEncoder().encode(await tokenHash(value));
  const stored = new TextEncoder().encode(expected);
  return actual.byteLength === stored.byteLength && crypto.subtle.timingSafeEqual(actual, stored);
}

export function bearer(request: Request): string {
  const value = request.headers.get("Authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!value) throw new HttpError(401, "A bearer token is required");
  return value;
}

export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!request.body) throw new HttpError(400, "A JSON body is required");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request body exceeds the limit");
    }
    chunks.push(item.value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(data));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

export function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function failure(error: unknown): Response {
  if (error instanceof HttpError)
    return json({ error: error.message, ...error.details }, error.status);
  console.error("Relay operation failed");
  return json({ error: "Relay operation failed" }, 500);
}
