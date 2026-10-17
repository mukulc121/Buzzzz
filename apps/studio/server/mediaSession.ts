import { randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Msg } from "@buzzzz/core";
import { MediaHttpError, mediaJson, readMediaBody, sendMedia } from "./mediaHttp.ts";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_STORE_BYTES = 100 * 1024 * 1024;
interface IAsset {
  token: string;
  bytes: number;
  contentType: string;
  buffer?: Buffer;
}

function matches(value: string, expected: string): boolean {
  const actual = Buffer.from(value);
  const stored = Buffer.from(expected);
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

export class LocalMediaSession {
  private readonly roomId = randomBytes(16).toString("hex");
  private readonly hostToken = randomBytes(32).toString("base64url");
  private readonly assets = new Map<string, IAsset>();
  private bytes = 0;
  private closed = false;
  private readonly publicOrigin: () => string;

  constructor(publicOrigin: () => string) {
    this.publicOrigin = publicOrigin;
  }

  handles(path: string): boolean {
    return path === "/media/session" || path.startsWith("/v1/rooms/");
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader("cache-control", "private, no-store");
    const url = new URL(req.url ?? "/", this.publicOrigin());
    if (this.closed) throw new MediaHttpError(410, "Media session is closed");
    if (url.pathname === "/media/session") {
      if (req.method === "GET") return mediaJson(res, { roomId: this.roomId });
      if (req.method === "POST") {
        if (!req.headers.origin) throw new MediaHttpError(403, "A Studio origin is required");
        return mediaJson(res, {
          origin: this.publicOrigin(),
          roomId: this.roomId,
          hostToken: this.hostToken,
        });
      }
    }
    const prefix = `/v1/rooms/${this.roomId}/assets`;
    if (url.pathname === prefix && req.method === "POST") {
      if (!matches(req.headers.authorization ?? "", `Bearer ${this.hostToken}`))
        throw new MediaHttpError(401, "A host session is required");
      return await this.upload(req, res, url);
    }
    if (
      ["GET", "HEAD"].includes(req.method ?? "") &&
      new RegExp(`^${prefix}/[a-f0-9]{32}\\.bin$`).test(url.pathname) &&
      /^\?token=[A-Za-z0-9_-]{43}$/.test(url.search)
    ) {
      const id = url.pathname.slice(prefix.length + 1);
      const asset = this.assets.get(id);
      if (asset?.buffer && matches(url.searchParams.get("token") ?? "", asset.token))
        return sendMedia(req, res, id, asset.contentType, asset.buffer);
    }
    throw new MediaHttpError(404, "Media asset not found");
  }

  private async upload(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const length = Number(req.headers["content-length"]);
    if (!Number.isSafeInteger(length) || length <= 0)
      throw new MediaHttpError(411, "Content-Length is required");
    if (length > MAX_FILE_BYTES) throw new MediaHttpError(413, "Files must be at most 20 MiB");
    if (url.search !== "?kind=media") throw new MediaHttpError(400, "Choose kind=media");
    const contentType = req.headers["content-type"]?.split(";")[0]?.trim() ?? "";
    if (
      !/^(?:audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/(?:json|zip\+dotlottie))$/.test(
        contentType,
      )
    )
      throw new MediaHttpError(415, "Unsupported media type");
    if (this.assets.size >= 10 || this.bytes + length > MAX_STORE_BYTES)
      throw new MediaHttpError(409, "Room storage limit reached");
    const id = `${randomBytes(16).toString("hex")}.bin`;
    const asset: IAsset = {
      token: randomBytes(32).toString("base64url"),
      bytes: length,
      contentType,
    };
    this.assets.set(id, asset);
    this.bytes += length;
    try {
      const buffer = await readMediaBody(req, length);
      if (this.closed) throw new MediaHttpError(410, "Media session is closed");
      asset.buffer = buffer;
    } catch (error) {
      if (this.assets.delete(id)) this.bytes -= length;
      throw error;
    }
    const download = new URL(`/v1/rooms/${this.roomId}/assets/${id}`, this.publicOrigin());
    download.searchParams.set("token", asset.token);
    mediaJson(res, { assetId: id, path: download.href, url: download.href, bytes: length }, 201);
  }

  validate(message: Msg, senderOrigin: string): boolean {
    if (message.type !== "audio-haptics" && message.type !== "animation-haptics") return true;
    const clip = message.type === "audio-haptics" ? message.audio : message.animation;
    const url = new URL(clip.downloadUrl);
    const asset = this.assets.get(url.pathname.split("/").at(-1) ?? "");
    return (
      !this.closed &&
      [this.publicOrigin(), senderOrigin].includes(url.origin) &&
      url.pathname.startsWith(`/v1/rooms/${this.roomId}/assets/`) &&
      !!asset?.buffer &&
      matches(url.searchParams.get("token") ?? "", asset.token) &&
      asset.bytes === clip.size &&
      asset.contentType === clip.contentType
    );
  }

  forRecipient(message: Msg, origin: string): Msg {
    if (message.type !== "audio-haptics" && message.type !== "animation-haptics") return message;
    const clip = message.type === "audio-haptics" ? message.audio : message.animation;
    const url = new URL(clip.downloadUrl);
    const downloadUrl = new URL(`${url.pathname}${url.search}`, origin).href;
    return message.type === "audio-haptics"
      ? { ...message, audio: { ...message.audio, downloadUrl } }
      : { ...message, animation: { ...message.animation, downloadUrl } };
  }

  close(): void {
    this.closed = true;
    this.assets.clear();
    this.bytes = 0;
  }
}
