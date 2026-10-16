import { describe, expect, test } from "bun:test";
import { connectionTarget } from "../src/features/connection/connectionTarget";

describe("phone relay connection policy", () => {
  test("allows private and loopback local WebSockets", () => {
    for (const host of [
      "localhost",
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.1.2",
      "169.254.1.2",
      "[::1]",
      "[fd12::1]",
      "[fc00::1]",
      "[fdff::1]",
      "[fe80::1]",
      "[febf::1]",
      "[::ffff:127.0.0.1]",
    ])
      expect(connectionTarget(`ws://${host}:5173/relay`).protocol).toBe("ws:");
  });
  test("rejects public and arbitrary DNS cleartext addresses", () => {
    for (const host of [
      "8.8.8.8",
      "172.15.255.255",
      "172.32.0.1",
      "192.169.1.1",
      "example.com",
      "computer.local",
      "localhost.example.com",
      "[2001:4860:4860::8888]",
      "[fc::1]",
      "[fd::1]",
      "[fe8::1]",
      "[feb::1]",
      "[fec0::1]",
      "[::ffff:8.8.8.8]",
      "0x08080808",
    ])
      expect(() => connectionTarget(`ws://${host}:5173/relay`)).toThrow(
        "Remote servers require WSS",
      );
  });
  test("allows secure remote relays and extracts only the destination origin", () => {
    expect(connectionTarget("wss://relay.example/relay?token=secret").origin).toBe(
      "wss://relay.example",
    );
    expect(
      connectionTarget("rivehaptics://connect?url=ws%3A%2F%2F192.168.1.2%3A5173%2Frelay").origin,
    ).toBe("ws://192.168.1.2:5173");
    expect(() =>
      connectionTarget("rivehaptics://connect?url=ws%3A%2F%2Fexample.com%2Frelay"),
    ).toThrow("WSS");
  });
});
