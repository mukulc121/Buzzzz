import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { Database } from "bun:sqlite";
import { RoomRateLimit } from "../src/rates.ts";

function sqlStorage(): SqlStorage {
  const db = new Database(":memory:");
  db.run(
    "CREATE TABLE rates (name TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)",
  );
  const storage = {
    exec(query: string, ...bindings: (string | number)[]) {
      const rows = db.query(query).all(...bindings);
      return { one: () => rows[0], toArray: () => rows };
    },
  };
  return storage as unknown as SqlStorage;
}

function allowed(rates: RoomRateLimit, count: number): number {
  let passed = 0;
  for (let index = 0; index < count; index++) {
    try {
      rates.check("burst", 480);
      passed += 1;
    } catch {}
  }
  return passed;
}

describe("room rate windows", () => {
  afterEach(() => setSystemTime());

  test("a burst straddling a clock minute still stops at the limit", () => {
    const rates = new RoomRateLimit(sqlStorage());
    setSystemTime(new Date("2026-10-16T17:35:59.500Z"));
    expect(allowed(rates, 300)).toBe(300);
    setSystemTime(new Date("2026-10-16T17:36:00.100Z"));
    expect(allowed(rates, 181)).toBe(180);
  });

  test("the window resets one period after its first request", () => {
    const rates = new RoomRateLimit(sqlStorage());
    setSystemTime(new Date("2026-10-16T17:35:59.500Z"));
    expect(allowed(rates, 481)).toBe(480);
    setSystemTime(new Date("2026-10-16T17:36:59.499Z"));
    expect(allowed(rates, 1)).toBe(0);
    setSystemTime(new Date("2026-10-16T17:36:59.500Z"));
    expect(allowed(rates, 481)).toBe(480);
  });
});
