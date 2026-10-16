import { isProject, isRecord } from "@buzzzz/core";
import {
  HttpError,
  json,
  randomId,
  randomToken,
  readJson,
  tokenHash,
  tokenMatches,
} from "./security.ts";
import type { Room } from "./model.ts";
import { isProjectId } from "./projectId.ts";
import type { RoomRateLimit } from "./rates.ts";

type Share = { id: string; read_hash: string; project: string };

export class RoomShares {
  constructor(
    private sql: SqlStorage,
    private active: () => Room,
    private rates: RoomRateLimit,
  ) {}

  async create(request: Request, room: Room): Promise<Response> {
    const body = await readJson(request, 1024 * 1024);
    if (!isRecord(body) || !isProject(body.project) || !isProjectId(body.projectId))
      throw new HttpError(400, "A valid project and projectId are required");
    const id = randomId();
    const token = randomToken();
    const hash = await tokenHash(token);
    this.active();
    if (this.sql.exec<{ count: number }>("SELECT count(*) AS count FROM shares").one().count >= 10)
      throw new HttpError(409, "Room share limit reached");
    this.sql.exec(
      "INSERT INTO shares (id, read_hash, project, project_id) VALUES (?, ?, ?, ?)",
      id,
      hash,
      JSON.stringify(body.project),
      body.projectId,
    );
    const url = new URL(`/v1/shares/${room.id}/${id}`, room.origin);
    url.searchParams.set("token", token);
    return json({ shareId: id, token, url: url.href, expiresAt: room.expires }, 201);
  }

  async read(request: Request): Promise<Response> {
    this.rates.publicAttempt(request, "share");
    const url = new URL(request.url);
    const id = url.pathname.split("/").at(-1) ?? "";
    if (!/^[a-f0-9]{32}$/.test(id)) throw new HttpError(404, "Share not found");
    const share = this.sql.exec<Share>("SELECT * FROM shares WHERE id = ?", id).toArray()[0];
    const token = url.searchParams.get("token") ?? "";
    if (
      !share ||
      !/^[A-Za-z0-9_-]{43}$/.test(token) ||
      !(await tokenMatches(token, share.read_hash))
    )
      throw new HttpError(404, "Share not found");
    this.rates.publicRead(request, "share", share.id);
    return json({ project: JSON.parse(share.project), expiresAt: this.active().expires });
  }

  async update(request: Request, id: string): Promise<Response> {
    const body = await readJson(request, 1024 * 1024);
    if (!isRecord(body) || !isProject(body.project))
      throw new HttpError(400, "A valid project is required");
    const room = this.active();
    if (!this.sql.exec("SELECT id FROM shares WHERE id = ?", id).toArray().length)
      throw new HttpError(404, "Share not found");
    this.sql.exec("UPDATE shares SET project = ? WHERE id = ?", JSON.stringify(body.project), id);
    return json({ shareId: id, expiresAt: room.expires });
  }
}
