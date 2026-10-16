import { isRecord, isRelayMessageAllowed, parseMessage, type Msg } from "@buzzzz/core";
import { HttpError } from "./security.ts";
import type { RoomAssets } from "./assets.ts";
import type { RoomSessions } from "./sessions.ts";
import type { Room } from "./model.ts";
import { isStudioOrigin } from "./origins.ts";
import { closeSocket } from "./socketClose.ts";
import { EditorBridge } from "./editorBridge.ts";
import { socketState, type IConnection } from "./socketState.ts";
import type { RoomRateLimit } from "./rates.ts";

type Role = "host" | "phone";
export class RoomSockets {
  private bridge: EditorBridge;
  constructor(
    private ctx: DurableObjectState,
    private assets: RoomAssets,
    private sessions: RoomSessions,
    private active: () => Room,
    private studioOrigins: string,
    private rates: RoomRateLimit,
  ) {
    this.bridge = new EditorBridge(() => this.ctx.getWebSockets("host"));
  }

  async upgrade(request: Request, room: Room): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      throw new HttpError(426, "A WebSocket upgrade is required");
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const session = await this.sessions.authenticate(token);
    if (new URL(request.url).searchParams.has("role"))
      throw new HttpError(400, "Roles are assigned by the server");
    const origin = request.headers.get("Origin");
    const studio = isStudioOrigin(origin, this.studioOrigins);
    if (session.role === "host" && !studio) throw new HttpError(403, "A Studio origin is required");
    if (session.role === "phone" && origin && origin !== room.origin && !studio)
      throw new HttpError(403, "Phone origin is not allowed");
    this.rates.check(`connections:${session.hash}`, 60);
    if (this.ctx.getWebSockets().length >= 32)
      throw new HttpError(409, "Room has 32 connected clients");
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [session.role]);
    server.serializeAttachment({
      role: session.role,
      hash: session.hash,
      window: Date.now(),
      count: 0,
    } satisfies IConnection);
    server.send(JSON.stringify({ type: "session", role: session.role, expiresAt: room.expires }));
    if (session.role === "phone") {
      for (const row of this.ctx.storage.sql.exec<{ value: string }>(
        "SELECT value FROM state ORDER BY name",
      ))
        server.send(row.value);
    }
    this.peers();
    return new Response(null, { status: 101, webSocket: client });
  }

  async message(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    try {
      const room = this.active();
      const connection = socketState(socket);
      if (
        !connection ||
        !this.ctx.storage.sql
          .exec(
            "SELECT hash FROM sessions WHERE hash = ? AND expires > ?",
            connection.hash,
            Date.now(),
          )
          .toArray().length
      )
        throw new HttpError(401, "Session expired or revoked");
      const text = this.rates.message(socket, connection, raw);
      const message = parseMessage(text);
      let envelope: unknown;
      try {
        envelope = JSON.parse(text);
      } catch {
        throw new HttpError(400, "Invalid relay message");
      }
      if (isRecord(envelope) && envelope.type === "editor-result") {
        if (connection.role !== "host")
          throw new HttpError(403, "Only the assigned editor can answer");
        this.bridge.receive(socket, envelope);
        return;
      }
      if (!message) throw new HttpError(400, "Invalid relay message");
      if (!isRelayMessageAllowed(connection.role, message.type))
        throw new HttpError(403, "Message is not allowed for this role");
      if (message.type === "load") {
        await this.assets.validateRive(message.riv, room);
        this.ctx.storage.sql.exec("DELETE FROM state");
        this.ctx.storage.sql.exec("INSERT INTO state (name, value) VALUES ('load', ?)", text);
      } else if (message.type === "map") {
        this.ctx.storage.sql.exec(
          "INSERT INTO state (name, value) VALUES ('map', ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value",
          text,
        );
      }
      this.broadcast(message, connection.role === "host" ? "phone" : "host");
    } catch (error) {
      const code =
        error instanceof HttpError
          ? [401, 410].includes(error.status)
            ? 4401
            : error.status === 429
              ? 4429
              : 1008
          : 1011;
      closeSocket(
        socket,
        code,
        error instanceof HttpError ? error.message : "Relay operation failed",
      );
    }
  }

  closed(socket: WebSocket, code: number, reason: string): void {
    this.bridge.disconnected(socket);
    closeSocket(socket, code, reason);
    this.peers();
  }

  error(socket: WebSocket): void {
    this.bridge.disconnected(socket);
    closeSocket(socket, 1011, "Connection failed");
    this.peers();
  }

  private broadcast(
    message: Msg | { type: "project-changed"; revision: number },
    role?: Role,
  ): void {
    const raw = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets(role)) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(raw);
        } catch {
          closeSocket(socket, 1011, "Connection failed");
        }
      }
    }
  }

  peers(): void {
    const phones = this.phoneCount();
    this.broadcast({ type: "peers", phones });
  }

  close(role?: Role): void {
    for (const socket of this.ctx.getWebSockets(role)) {
      this.bridge.disconnected(socket);
      closeSocket(socket, 4401, "Session expired or revoked");
    }
  }

  phoneCount(): number {
    return this.ctx.getWebSockets("phone").filter((socket) => socket.readyState === WebSocket.OPEN)
      .length;
  }
  projectChanged(revision: number): void {
    this.broadcast({ type: "project-changed", revision }, "host");
  }
  async editorCommand(command: string, args: Record<string, unknown>): Promise<unknown> {
    return await this.bridge.call(command, args);
  }
  command(message: Msg) {
    if (!isRelayMessageAllowed("host", message.type) || !parseMessage(JSON.stringify(message)))
      throw new HttpError(400, "Invalid host command");
    this.active();
    this.broadcast(message, "phone");
    return { phones: this.phoneCount() };
  }
}
