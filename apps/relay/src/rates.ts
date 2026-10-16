import { HttpError } from "./security.ts";
import type { IConnection } from "./socketState.ts";

export class RoomRateLimit {
  constructor(private sql: SqlStorage) {}
  publicAttempt(request: Request, kind: "asset" | "share"): void {
    this.check(`${kind}-attempts:${request.headers.get("CF-Connecting-IP") ?? "local"}`, 480);
  }
  publicRead(request: Request, kind: "asset" | "share", id: string): void {
    this.check(`${kind}-reads:${id}:${request.headers.get("CF-Connecting-IP") ?? "local"}`, 240);
  }
  check(name: string, limit: number, period = 60_000): void {
    // Windows start at the first request so a burst can't straddle a clock boundary and reset.
    const now = Date.now();
    this.sql.exec(
      "INSERT INTO rates (name, window, count) VALUES (?1, ?2, 1) ON CONFLICT(name) DO UPDATE SET count = CASE WHEN ?2 - window < ?3 THEN count + 1 ELSE 1 END, window = CASE WHEN ?2 - window < ?3 THEN window ELSE ?2 END",
      name,
      now,
      period,
    );
    const row = this.sql
      .exec<{ count: number }>("SELECT count FROM rates WHERE name = ?", name)
      .one();
    if (row.count > limit) throw new HttpError(429, "Room rate limit reached");
  }

  message(socket: WebSocket, connection: IConnection, raw: string | ArrayBuffer): string {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).byteLength > 2 * 1024 * 1024)
      throw new HttpError(413, "Message exceeds the limit");
    if (Date.now() - connection.window >= 10_000) {
      connection.window = Date.now();
      connection.count = 0;
    }
    connection.count += 1;
    socket.serializeAttachment(connection);
    if (connection.count > 120) throw new HttpError(429, "Message rate limit reached");
    this.check("messages", 600, 10_000);
    return raw;
  }
}
