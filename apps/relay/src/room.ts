import { DurableObject } from "cloudflare:workers";
import { bearer, failure, HttpError, json, tokenHash } from "./security.ts";

import { RoomAssets } from "./assets.ts";
import { RoomShares } from "./shares.ts";
import type { Room } from "./model.ts";
import { RoomSessions } from "./sessions.ts";
import { RoomSockets } from "./sockets.ts";
import { RoomProject } from "./project.ts";
import { McpDispatcher } from "./mcp/dispatch.ts";
import { handleMcp } from "./mcp/server.ts";
import { RoomRateLimit } from "./rates.ts";
import { hasRoomSchema, initializeRoomSchema } from "./schema.ts";

export class RelayRoom extends DurableObject<Env> {
  private assets: RoomAssets;
  private shares: RoomShares;
  private sessions: RoomSessions;
  private sockets: RoomSockets;
  private project: RoomProject;
  private mcp: McpDispatcher;
  private rates: RoomRateLimit;
  private initialized: boolean;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.initialized = hasRoomSchema(ctx.storage.sql);
    if (this.initialized) initializeRoomSchema(ctx.storage.sql);
    this.rates = new RoomRateLimit(ctx.storage.sql);
    this.assets = new RoomAssets(ctx.storage.sql, env.ASSETS, () => this.room(), this.rates);
    this.shares = new RoomShares(ctx.storage.sql, () => this.room(), this.rates);
    this.sessions = new RoomSessions(
      ctx.storage.sql,
      () => this.room(),
      env.PAIR_TTL_SECONDS,
      this.rates,
      env.PAIRING_CODES,
    );
    this.sockets = new RoomSockets(
      ctx,
      this.assets,
      this.sessions,
      () => this.room(),
      env.STUDIO_ORIGINS,
      this.rates,
    );
    this.project = new RoomProject(
      ctx.storage,
      () => this.room(),
      (revision) => this.sockets.projectChanged(revision),
    );
    this.mcp = new McpDispatcher(this.project, this.assets, this.sockets, () => this.room());
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  // fallow-ignore-next-line unused-class-member
  async create(id: string, origin: string) {
    if (!this.initialized) {
      initializeRoomSchema(this.ctx.storage.sql);
      this.initialized = true;
    }
    const room = await this.sessions.createRoom(id, origin, this.env.SESSION_TTL_SECONDS);
    await this.ctx.storage.setAlarm(room.expiresAt);
    return room;
  }

  private room(): Room {
    if (!this.initialized) throw new HttpError(410, "Room expired or revoked");
    const row = this.ctx.storage.sql.exec<Room>("SELECT * FROM room").toArray()[0];
    if (!row || row.expires <= Date.now()) throw new HttpError(410, "Room expired or revoked");
    return row;
  }

  // fallow-ignore-next-line unused-class-member
  async pairByCode(code: string, device: string, ip: string): Promise<Response> {
    try {
      const hash = await tokenHash(code);
      const room = this.room();
      const encoder = new TextEncoder();
      if (!crypto.subtle.timingSafeEqual(encoder.encode(hash), encoder.encode(room.pair_hash)))
        throw new HttpError(401, "Pairing code expired or invalid");
      return await this.sessions.pair(
        new Request(new URL(`/v1/rooms/${room.id}/pair`, room.origin), {
          method: "POST",
          headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
          body: JSON.stringify({ code, device }),
        }),
        room,
      );
    } catch (error) {
      return failure(error);
    }
  }

  // fallow-ignore-next-line unused-class-member
  async fetch(request: Request): Promise<Response> {
    try {
      const room = this.room();
      const url = new URL(request.url);
      if (url.pathname === "/relay" && request.method === "GET") {
        return await this.sockets.upgrade(request, room);
      }
      const path = url.pathname.replace(`/v1/rooms/${room.id}`, "");
      if (path === "/pair" && request.method === "POST") {
        return await this.sessions.pair(request, room);
      }
      if (
        new RegExp(`^/v1/shares/${room.id}/[a-f0-9]{32}$`).test(url.pathname) &&
        request.method === "GET"
      ) {
        return await this.shares.read(request);
      }
      if (
        /^\/assets\/[a-f0-9]{32}\.(?:riv|bin)$/.test(path) &&
        (request.method === "GET" || request.method === "HEAD")
      ) {
        return await this.assets.read(request, path);
      }
      await this.sessions.authenticate(bearer(request), "host");
      this.rates.check("host", 60);
      if (path === "/project") return await this.project.handle(request);
      if (path === "/mcp") return await handleMcp(request, this.mcp);
      if (path === "/pairing" && request.method === "POST") return await this.sessions.rotate(room);
      if (path === "/phones" && request.method === "DELETE") {
        this.ctx.storage.sql.exec("DELETE FROM sessions WHERE role = 'phone'");
        this.sockets.close("phone");
        this.sockets.peers();
        return json({ revoked: true });
      }
      if (path === "/assets" && request.method === "POST") {
        this.rates.check("uploads", 10);
        return await this.assets.upload(request, room);
      }
      if (/^\/assets\/[a-f0-9]{32}\.(?:riv|bin)$/.test(path) && request.method === "DELETE") {
        await this.assets.delete(path.split("/").at(-1) ?? "");
        return json({ revoked: true });
      }
      if (path === "/shares" && request.method === "POST")
        return await this.shares.create(request, room);
      if (/^\/shares\/[a-f0-9]{32}$/.test(path) && request.method === "PUT") {
        return await this.shares.update(request, path.split("/").at(-1) ?? "");
      }
      if (/^\/shares\/[a-f0-9]{32}$/.test(path) && request.method === "DELETE") {
        this.ctx.storage.sql.exec("DELETE FROM shares WHERE id = ?", path.split("/").at(-1) ?? "");
        return json({ revoked: true });
      }
      if (path === "" && request.method === "DELETE") {
        this.ctx.storage.sql.exec("UPDATE room SET expires = 0");
        await this.cleanup();
        return json({ revoked: true });
      }
      throw new HttpError(404, "Not found");
    } catch (error) {
      return failure(error);
    }
  }

  // fallow-ignore-next-line unused-class-member
  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.sockets.message(socket, message);
  }

  // fallow-ignore-next-line unused-class-member
  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    this.sockets.closed(socket, code, reason);
  }

  // fallow-ignore-next-line unused-class-member
  webSocketError(socket: WebSocket): void {
    this.sockets.error(socket);
  }

  private async cleanup(): Promise<void> {
    this.sockets.close();
    const assets = this.ctx.storage.sql
      .exec<{ object_key: string }>("SELECT object_key FROM assets")
      .toArray();
    if (assets.length) await this.env.ASSETS.delete(assets.map((asset) => asset.object_key));
    this.ctx.storage.sql.exec(
      "DELETE FROM sessions; DELETE FROM assets; DELETE FROM shares; DELETE FROM state; DELETE FROM project; DELETE FROM rates; DELETE FROM room;",
    );
    await this.ctx.storage.deleteAlarm();
  }

  // fallow-ignore-next-line unused-class-member
  async alarm(): Promise<void> {
    await this.cleanup();
  }
}
