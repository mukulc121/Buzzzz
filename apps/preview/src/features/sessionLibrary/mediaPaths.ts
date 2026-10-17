function segment(value: string): string {
  if (!value || value === "." || value === ".." || /[\\/]/.test(value) || value.includes("\0"))
    throw new Error("A Studio media path is invalid");
  return encodeURIComponent(value);
}

export function mediaConnectionPath(connectionId: string): string {
  return segment(connectionId);
}

export function mediaClipPath(connectionId: string, clipId: string, contentType: string): string {
  let extension = "bin";
  if (/wav/i.test(contentType)) extension = "wav";
  else if (/mpeg|mp3/i.test(contentType)) extension = "mp3";
  else if (/zip/i.test(contentType)) extension = "lottie";
  else if (/json/i.test(contentType)) extension = "json";
  return `${segment(connectionId)}/${segment(clipId)}.${extension}`;
}

export function isMediaClipPath(value: unknown): value is string {
  if (typeof value !== "string" || /[\\?#]/.test(value) || value.includes("\0")) return false;
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some((part) => !part || part === "." || part === ".."))
    return false;
  try {
    return parts.every((part) => {
      const decoded = decodeURIComponent(part);
      return (
        decoded !== "." && decoded !== ".." && !/[\\/]/.test(decoded) && !decoded.includes("\0")
      );
    });
  } catch {
    return false;
  }
}

export function storedMediaClipPath(value: { clipPath?: unknown; localUri?: unknown }): unknown {
  if (value.clipPath !== undefined) return value.clipPath;
  if (typeof value.localUri !== "string") return undefined;
  const marker = "pulsar-media/";
  const offset = value.localUri.indexOf(marker);
  return offset < 0 ? undefined : value.localUri.slice(offset + marker.length);
}
