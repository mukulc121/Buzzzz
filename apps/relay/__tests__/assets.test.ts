import { describe, expect, test } from "bun:test";
import { roomAssetLocation } from "../src/assets.ts";

const room = { id: "a".repeat(32), origin: "https://relay.example" };
const token = "c".repeat(43);
const path = `/v1/rooms/${room.id}/assets/${"b".repeat(32)}.riv`;
const valid = `${room.origin}${path}?token=${token}`;

describe("room asset locations", () => {
  test("accepts an exact signed URL in this room", () => {
    expect(roomAssetLocation(valid, room)).toEqual({ id: `${"b".repeat(32)}.riv`, token });
  });
  test.each([
    valid.replace("relay.example", "attacker.example"),
    valid.replace(room.id, "d".repeat(32)),
    valid.replace("https:", "http:"),
    valid.replace("https://", "https://user:password@"),
    `${valid}&extra=true`,
    `${valid}#fragment`,
    `${room.origin}${path}`,
    valid.replace(token, "short"),
    "/riv/abc.riv",
    `${room.origin}${path}?token=${token}&token=${token}`,
  ])("rejects an untrusted or malformed location: %s", (url) => {
    expect(() => roomAssetLocation(url, room)).toThrow();
  });
});
