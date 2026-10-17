import { MEDIA_LIMITS } from "../media/model";
import type { TMediaKind } from "./commands";
import { CommandError } from "./guards";

const TYPES: Record<TMediaKind, RegExp> = {
  audio: /^(?:audio|video)\/[a-z0-9.+-]+$/,
  animation: /^application\/(?:json|zip\+dotlottie)$/,
};

// Same rules as the relay: a signed asset of this room on the configured relay origin only.
export function roomAssetUrl(input: string, origin: string, roomId: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new CommandError("assetUrl must be an uploaded room asset URL");
  }
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.hash ||
    !new RegExp(`^/v1/rooms/${roomId}/assets/[a-f0-9]{32}\\.(?:riv|bin)$`).test(url.pathname) ||
    !/^\?token=[A-Za-z0-9_-]{43}$/.test(url.search)
  )
    throw new CommandError("assetUrl must be a signed asset from this room");
  return url;
}

async function readCapped(response: Response, limit: number): Promise<Uint8Array[]> {
  const reader = response.body?.getReader();
  if (!reader) throw new CommandError("The asset response was empty");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const item = await reader.read();
    if (item.done) return chunks;
    size += item.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new CommandError("The asset exceeds 20 MiB");
    }
    chunks.push(item.value);
  }
}

// No cookies, no redirects, no referrer: the signed URL is the only credential sent.
export async function fetchRoomAsset(input: {
  url: string;
  kind: TMediaKind;
  signal: AbortSignal;
}): Promise<Blob> {
  const response = await fetch(input.url, {
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    signal: input.signal,
  });
  if (!response.ok) throw new CommandError("The room asset is missing or its link expired");
  const type = response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!TYPES[input.kind].test(type))
    throw new CommandError(`The asset type ${type || "unknown"} is not ${input.kind} media`);
  const length = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > MEDIA_LIMITS.fileBytes)
    throw new CommandError("The asset exceeds 20 MiB");
  const chunks = await readCapped(response, MEDIA_LIMITS.fileBytes);
  return new Blob(
    chunks.map((chunk) => new Uint8Array(chunk)),
    { type },
  );
}

export const safeFilename = (name: string) =>
  Array.from(name, (letter) =>
    letter === "/" || letter === "\\" || letter.charCodeAt(0) < 32 || letter.charCodeAt(0) === 127
      ? "_"
      : letter,
  )
    .join("")
    .trim()
    .slice(0, MEDIA_LIMITS.nameLength) || "attachment";
