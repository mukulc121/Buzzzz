import { HttpError, json, randomToken, readJson, tokenHash, tokenMatches } from "./security.ts";
import type { Room } from "./model.ts";
import type { RoomRateLimit } from "./rates.ts";
import { PairingAttempts } from "./pairingAttempts.ts";
import type { PairingCode } from "./pairingCodes.ts";
import { allocatePairingCode } from "./pairingCode.ts";
import { pairingInput } from "./pairingInput.ts";

type Role = "host" | "phone";
type Session = { hash: string; role: Role; expires: number };
interface IPairingRotation {
  code: string;
  expiresAt: number;
}

function sessionRelayUrl(origin: string, id: string, token: string): string {
  const url = new URL("/relay", origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("room", id);
  url.searchParams.set("token", token);
  return url.href;
}

function ttl(value: string, maximum = 600): number {
  const seconds = Number(value);
  return (Number.isFinite(seconds) ? Math.max(1, Math.min(maximum, seconds)) : maximum) * 1000;
}

export class RoomSessions {
  private attempts: PairingAttempts;
  private rotation: Promise<IPairingRotation> | null = null;
  constructor(
    private sql: SqlStorage,
    private active: () => Room,
    private pairTtl: string,
    private rates: RoomRateLimit,
    private codes: DurableObjectNamespace<PairingCode>,
  ) {
    this.attempts = new PairingAttempts(sql, rates);
  }

  private async reserveCode(roomId: string, expiresAt: number) {
    const code = await allocatePairingCode(async (candidate) => {
      const hash = await tokenHash(candidate);
      return this.codes.getByName(hash).reserve(roomId, expiresAt);
    });
    return { code, hash: await tokenHash(code) };
  }

  async createRoom(id: string, origin: string, sessionTtl: string) {
    if (this.sql.exec("SELECT id FROM room").toArray().length)
      throw new HttpError(409, "Room already exists");
    const hostToken = randomToken();
    const expiresAt = Date.now() + ttl(sessionTtl, 86400);
    const pairExpires = Math.min(expiresAt, Date.now() + ttl(this.pairTtl, 600));
    const [hostHash, pairing] = await Promise.all([
      tokenHash(hostToken),
      this.reserveCode(id, pairExpires),
    ]);
    if (this.sql.exec("SELECT id FROM room").toArray().length)
      throw new HttpError(409, "Room already exists");
    this.sql.exec(
      "INSERT INTO room (id, origin, expires, pair_hash, pair_expires) VALUES (?, ?, ?, ?, ?)",
      id,
      origin,
      expiresAt,
      pairing.hash,
      pairExpires,
    );
    this.sql.exec(
      "INSERT INTO sessions (hash, role, expires) VALUES (?, 'host', ?)",
      hostHash,
      expiresAt,
    );
    return {
      roomId: id,
      hostToken,
      expiresAt,
      pairing: { code: pairing.code, expiresAt: pairExpires },
      relayUrl: sessionRelayUrl(origin, id, hostToken),
    };
  }

  async authenticate(token: string, required?: Role): Promise<Session> {
    this.active();
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(401, "Invalid session token");
    const hash = await tokenHash(token);
    const row = this.sql
      .exec<Session>("SELECT * FROM sessions WHERE hash = ? AND expires > ?", hash, Date.now())
      .toArray()[0];
    if (!row) throw new HttpError(401, "Invalid session token");
    if (required && row.role !== required) throw new HttpError(403, "Host permission is required");
    return row;
  }

  async rotate(room: Room): Promise<Response> {
    const pending = (this.rotation ??= this.rotateCode(room));
    try {
      return json(await pending);
    } finally {
      if (this.rotation === pending) this.rotation = null;
    }
  }

  private async rotateCode(room: Room): Promise<IPairingRotation> {
    const previous = this.active();
    const expiresAt = Math.min(room.expires, Date.now() + ttl(this.pairTtl));
    const pairing = await this.reserveCode(room.id, expiresAt);
    const current = this.active();
    if (current.pair_hash !== previous.pair_hash)
      throw new HttpError(409, "Pairing code changed. Refresh it in Studio");
    this.sql.exec(
      "UPDATE room SET pair_hash = ?, pair_expires = ?, pair_used = 0, pair_attempts = 0",
      pairing.hash,
      expiresAt,
    );
    this.attempts.reset();
    return { code: pairing.code, expiresAt };
  }

  async pair(request: Request, room: Room): Promise<Response> {
    this.attempts.reserve(request, room);
    const input = pairingInput(await readJson(request, 1024));
    if (
      room.pair_used ||
      room.pair_expires <= Date.now() ||
      !(await tokenMatches(input.code, room.pair_hash))
    ) {
      this.attempts.reject(room);
    }
    const phoneToken = randomToken();
    const hash = await tokenHash(phoneToken);
    const current = this.active();
    if (
      current.pair_used ||
      current.pair_hash !== room.pair_hash ||
      current.pair_expires <= Date.now()
    )
      throw new HttpError(401, "Pairing code expired or invalid");
    const count = this.sql
      .exec<{ count: number }>("SELECT count(*) AS count FROM sessions WHERE role = 'phone'")
      .one().count;
    if (count >= 16) throw new HttpError(409, "Revoke paired phones before adding more");
    this.rates.check("pair-valid", 10);
    this.sql.exec("UPDATE room SET pair_used = 1");
    this.sql.exec(
      "INSERT INTO sessions (hash, role, expires) VALUES (?, 'phone', ?)",
      hash,
      room.expires,
    );
    return json(
      {
        roomId: room.id,
        phoneToken,
        expiresAt: room.expires,
        relayUrl: sessionRelayUrl(room.origin, room.id, phoneToken),
      },
      201,
    );
  }
}
