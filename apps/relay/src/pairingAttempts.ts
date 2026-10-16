import type { Room } from "./model.ts";
import type { RoomRateLimit } from "./rates.ts";
import { HttpError } from "./security.ts";

const CODE_ATTEMPTS = 30;

export class PairingAttempts {
  constructor(
    private sql: SqlStorage,
    private rates: RoomRateLimit,
  ) {}

  reserve(request: Request, room: Room): void {
    const ip = request.headers.get("CF-Connecting-IP") ?? "local";
    this.rates.check(`pair-attempts:${ip}`, 10);
    if (room.pair_attempts >= CODE_ATTEMPTS) {
      this.sql.exec("UPDATE room SET pair_used = 1 WHERE pair_hash = ?", room.pair_hash);
      throw new HttpError(429, "Pairing code exhausted. Refresh it in Studio");
    }
    if (room.pair_used || room.pair_expires <= Date.now())
      throw new HttpError(401, "Pairing code expired or invalid");
    this.sql.exec(
      "UPDATE room SET pair_attempts = pair_attempts + 1 WHERE pair_hash = ?",
      room.pair_hash,
    );
  }

  reject(room: Room): never {
    this.sql.exec(
      "UPDATE room SET pair_used = 1 WHERE pair_hash = ? AND pair_attempts >= ?",
      room.pair_hash,
      CODE_ATTEMPTS,
    );
    throw new HttpError(401, "Pairing code expired or invalid");
  }

  reset(): void {
    this.sql.exec("DELETE FROM rates WHERE name LIKE 'pair-attempts:%'");
  }
}
