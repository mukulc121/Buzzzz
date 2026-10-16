import { DurableObject } from "cloudflare:workers";
import { HttpError } from "./security.ts";

type Reservation = { room_id: string; expires: number };

export class PairingCode extends DurableObject<Env> {
  private reservation(): Reservation | undefined {
    const schema = this.ctx.storage.sql
      .exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reservation'")
      .toArray();
    if (!schema.length) return;
    return this.ctx.storage.sql
      .exec<Reservation>("SELECT room_id, expires FROM reservation WHERE id = 1")
      .toArray()[0];
  }

  // fallow-ignore-next-line unused-class-member
  async reserve(roomId: string, expiresAt: number): Promise<boolean> {
    const now = Date.now();
    if (
      !/^[a-f0-9]{32}$/.test(roomId) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now ||
      expiresAt > now + 600_000
    )
      throw new HttpError(400, "Invalid pairing reservation");
    const previous = this.reservation();
    if (previous && previous.expires > now) return false;
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS reservation (id INTEGER PRIMARY KEY CHECK (id = 1), room_id TEXT NOT NULL, expires INTEGER NOT NULL)",
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO reservation (id, room_id, expires) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET room_id = excluded.room_id, expires = excluded.expires",
      roomId,
      expiresAt,
    );
    await this.ctx.storage.setAlarm(expiresAt);
    return true;
  }

  // fallow-ignore-next-line unused-class-member
  lookup(): string | null {
    const reservation = this.reservation();
    return reservation && reservation.expires > Date.now() ? reservation.room_id : null;
  }

  // fallow-ignore-next-line unused-class-member
  async alarm(): Promise<void> {
    const reservation = this.reservation();
    if (reservation && reservation.expires > Date.now()) {
      await this.ctx.storage.setAlarm(reservation.expires);
      return;
    }
    await this.ctx.storage.deleteAll();
  }
}
