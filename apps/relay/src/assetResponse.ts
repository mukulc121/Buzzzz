import { HttpError } from "./security.ts";

interface IReadableAsset {
  content_type: string;
  bytes: number;
  object_key: string;
}

export async function assetResponse(
  request: Request,
  asset: IReadableAsset,
  bucket: R2Bucket,
): Promise<Response> {
  const headers = new Headers({
    "Content-Type": asset.content_type,
    "Content-Length": String(asset.bytes),
    "Content-Disposition": "attachment",
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Accept-Ranges": "bytes",
  });
  if (request.method === "HEAD") return new Response(null, { headers });
  let range: R2Range | undefined;
  const requested = request.headers.get("Range");
  if (requested) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(requested);
    const start = Number(match?.[1]);
    const end = match?.[2] ? Math.min(Number(match[2]), asset.bytes - 1) : asset.bytes - 1;
    if (!match || !Number.isSafeInteger(start) || start < 0 || start >= asset.bytes || end < start)
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${asset.bytes}`, "Cache-Control": "no-store" },
      });
    range = { offset: start, length: end - start + 1 };
    headers.set("Content-Length", String(end - start + 1));
    headers.set("Content-Range", `bytes ${start}-${end}/${asset.bytes}`);
  }
  const object = await bucket.get(asset.object_key, range ? { range } : undefined);
  if (!object) throw new HttpError(404, "Asset not found");
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
