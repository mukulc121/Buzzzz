import type { IncomingMessage, ServerResponse } from "node:http";

export class MediaHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function mediaJson(res: ServerResponse, value: unknown, status = 200): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(value));
}

export function readMediaBody(req: IncomingMessage, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > length) {
        chunks.length = 0;
        reject(new MediaHttpError(400, "File size does not match Content-Length"));
      } else chunks.push(chunk);
    });
    req.once("aborted", () => reject(new MediaHttpError(400, "Upload was interrupted")));
    req.once("error", reject);
    req.once("end", () => {
      if (bytes !== length)
        reject(new MediaHttpError(400, "File size does not match Content-Length"));
      else resolve(Buffer.concat(chunks));
    });
  });
}

export function sendMedia(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  contentType: string,
  buffer: Buffer,
): void {
  res.setHeader("content-type", contentType);
  res.setHeader("content-disposition", `attachment; filename="${id}"`);
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("content-security-policy", "default-src 'none'; sandbox");
  res.setHeader("accept-ranges", "bytes");
  let start = 0;
  let end = buffer.length - 1;
  if (req.headers.range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    start = Number(match?.[1]);
    end = match?.[2] ? Math.min(Number(match[2]), end) : end;
    if (!match || !Number.isSafeInteger(start) || start > end || start < 0) {
      res.statusCode = 416;
      res.setHeader("content-range", `bytes */${buffer.length}`);
      res.end();
      return;
    }
    res.statusCode = 206;
    res.setHeader("content-range", `bytes ${start}-${end}/${buffer.length}`);
  }
  res.setHeader("content-length", end - start + 1);
  res.end(req.method === "HEAD" ? undefined : buffer.subarray(start, end + 1));
}
