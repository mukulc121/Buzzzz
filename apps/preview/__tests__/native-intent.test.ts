import { expect, test } from "bun:test";
import { redirectSystemPath } from "../src/app/+native-intent";

test("native screen links retain their route", () => {
  for (const path of [
    "rivehaptics:///demos/buttons-demo",
    "rivehaptics:///tagsModal",
    "/playgroundModal",
  ]) {
    expect(redirectSystemPath({ path, initial: false })).toBe(path);
  }
});

test("pairing and relay links still enter the connection receiver", () => {
  const pairing = new URL("rivehaptics://pair");
  pairing.searchParams.set("server", "https://buzzzz.theclau.de");
  pairing.searchParams.set("room", "a".repeat(32));
  pairing.searchParams.set("code", "123456");
  const relay = new URL("rivehaptics://connect");
  relay.searchParams.set("url", "wss://buzzzz.theclau.de/relay");
  for (const path of [pairing.href, relay.href]) {
    expect(redirectSystemPath({ path, initial: true })).toBe("/");
  }
});
