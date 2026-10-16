import { isRiveAssetUrl } from "@buzzzz/core";
import { HttpError, json, randomId, randomToken, tokenHash, tokenMatches } from "./security.ts";
import type { Room } from "./model.ts";
import type { RoomRateLimit } from "./rates.ts";
import { assetResponse } from "./assetResponse.ts";

const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const MAX_ROOM_BYTES = 100 * 1024 * 1024;
type Asset = {
  id: string;
  object_key: string;
  bytes: number;
  content_type: string;
  read_hash: string;
  ready: number;
};

export function roomAssetLocation(
  input: string,
  room: Pick<Room, "id" | "origin">,
): { id: string; token: string } {
  if (!isRiveAssetUrl(input) || input.startsWith("/"))
    throw new HttpError(400, "Use an uploaded room asset");
  const url = new URL(input);
  if (url.origin !== room.origin || !url.pathname.startsWith(`/v1/rooms/${room.id}/assets/`))
    throw new HttpError(403, "Asset belongs to another room");
  return { id: url.pathname.split("/").at(-1) ?? "", token: url.searchParams.get("token") ?? "" };
}

export class RoomAssets {
  constructor(
    private sql: SqlStorage,
    private bucket: R2Bucket,
    private active: () => Room,
    private rates: RoomRateLimit,
  ) {}

  async validateRive(input: string, room: Room): Promise<void> {
    const { id, token } = roomAssetLocation(input, room);
    await this.asset(id, token);
  }

  async validateMedia(
    input: string,
    room: Room,
    expected?: { size: number; contentType: string },
  ): Promise<void> {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new HttpError(400, "Use an uploaded room asset URL");
    }
    if (
      url.origin !== room.origin ||
      url.username ||
      url.password ||
      url.hash ||
      !new RegExp(`^/v1/rooms/${room.id}/assets/[a-f0-9]{32}\\.(riv|bin)$`).test(url.pathname) ||
      !/^\?token=[A-Za-z0-9_-]{43}$/.test(url.search)
    )
      throw new HttpError(403, "Use a signed asset from this room");
    const asset = await this.asset(
      url.pathname.split("/").at(-1) ?? "",
      url.searchParams.get("token") ?? "",
    );
    if (expected && (asset.bytes !== expected.size || asset.content_type !== expected.contentType))
      throw new HttpError(403, "Media metadata does not match the uploaded asset");
  }

  list() {
    this.active();
    return this.sql
      .exec<{ id: string; bytes: number; content_type: string }>(
        "SELECT id, bytes, content_type FROM assets WHERE ready = 1 ORDER BY id",
      )
      .toArray()
      .map((asset) => ({ assetId: asset.id, bytes: asset.bytes, contentType: asset.content_type }));
  }

  async upload(request: Request, room: Room): Promise<Response> {
    const length = Number(request.headers.get("Content-Length"));
    if (!Number.isSafeInteger(length) || length <= 0)
      throw new HttpError(411, "Content-Length is required");
    if (length > MAX_ASSET_BYTES) throw new HttpError(413, "Files must be at most 20 MiB");
    if (!request.body) throw new HttpError(400, "A file body is required");
    const kind = new URL(request.url).searchParams.get("kind");
    const contentType =
      request.headers.get("Content-Type")?.split(";")[0]?.trim() ?? "application/octet-stream";
    if (kind !== "rive" && kind !== "media")
      throw new HttpError(400, "Choose kind=rive or kind=media");
    if (kind === "rive" && contentType !== "application/octet-stream")
      throw new HttpError(415, "Rive uploads use application/octet-stream");
    if (
      kind === "media" &&
      !/^(?:audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/(?:json|zip\+dotlottie))$/.test(
        contentType,
      )
    )
      throw new HttpError(415, "Unsupported media type");
    const id = `${randomId()}.${kind === "rive" ? "riv" : "bin"}`;
    const readToken = randomToken();
    const readHash = await tokenHash(readToken);
    this.active();
    const usage = this.sql
      .exec<{ count: number; bytes: number }>(
        "SELECT count(*) AS count, coalesce(sum(bytes), 0) AS bytes FROM assets",
      )
      .one();
    if (usage.count >= 10 || usage.bytes + length > MAX_ROOM_BYTES)
      throw new HttpError(409, "Room storage limit reached");
    const key = `${room.id}/${id}`;
    this.sql.exec(
      "INSERT INTO assets (id, object_key, bytes, content_type, read_hash) VALUES (?, ?, ?, ?, ?)",
      id,
      key,
      length,
      contentType,
      readHash,
    );
    try {
      const stream = new FixedLengthStream(length);
      await Promise.all([
        request.body.pipeTo(stream.writable),
        this.bucket.put(key, stream.readable, { httpMetadata: { contentType } }),
      ]);
      this.active();
      if (!this.sql.exec("SELECT id FROM assets WHERE id = ?", id).toArray().length)
        throw new HttpError(410, "Upload was revoked");
      this.sql.exec("UPDATE assets SET ready = 1 WHERE id = ?", id);
    } catch (error) {
      await this.bucket.delete(key);
      this.sql.exec("DELETE FROM assets WHERE id = ?", id);
      throw error;
    }
    const url = new URL(`/v1/rooms/${room.id}/assets/${id}`, room.origin);
    url.searchParams.set("token", readToken);
    return json(
      { assetId: id, path: url.href, url: url.href, bytes: length, expiresAt: room.expires },
      201,
    );
  }

  private async asset(id: string, token: string): Promise<Asset> {
    this.active();
    const asset = this.sql
      .exec<Asset>("SELECT * FROM assets WHERE id = ? AND ready = 1", id)
      .toArray()[0];
    if (
      !asset ||
      !/^[A-Za-z0-9_-]{43}$/.test(token) ||
      !(await tokenMatches(token, asset.read_hash))
    )
      throw new HttpError(404, "Asset not found");
    this.active();
    const current = this.sql
      .exec<Asset>("SELECT * FROM assets WHERE id = ? AND ready = 1", id)
      .toArray()[0];
    if (!current || current.read_hash !== asset.read_hash)
      throw new HttpError(404, "Asset not found");
    return current;
  }

  async read(request: Request, path: string): Promise<Response> {
    this.rates.publicAttempt(request, "asset");
    const url = new URL(request.url);
    const asset = await this.asset(
      path.split("/").at(-1) ?? "",
      url.searchParams.get("token") ?? "",
    );
    this.rates.publicRead(request, "asset", asset.id);
    return assetResponse(request, asset, this.bucket);
  }

  async delete(id: string): Promise<void> {
    const row = this.sql.exec<Asset>("SELECT * FROM assets WHERE id = ?", id).toArray()[0];
    if (!row) throw new HttpError(404, "Asset not found");
    this.sql.exec("UPDATE assets SET ready = 0 WHERE id = ?", id);
    await this.bucket.delete(row.object_key);
    this.sql.exec("DELETE FROM assets WHERE id = ?", id);
  }
}
