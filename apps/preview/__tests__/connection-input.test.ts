import { describe, expect, test } from "bun:test";
import {
  needsConnectionConsent,
  scannedConnection,
} from "../src/features/connection/connectionInput";
import { connectionTarget } from "../src/features/connection/connectionTarget";

const configured = "https://buzzzz.theclau.de";
const room = "a".repeat(32);
const link = `rivehaptics://pair?server=${encodeURIComponent(configured)}&room=${room}&code=001234`;

describe("phone pairing input", () => {
  test("QR parsing accepts exact numeric codes and existing full links", () => {
    for (const value of [
      "001234",
      link,
      "ws://192.168.1.2:5173/relay",
      "rivehaptics://connect?url=ws%3A%2F%2F192.168.1.2%3A5173%2Frelay",
    ])
      expect(scannedConnection(` \n${value} `)).toBe(value);
    for (const value of ["123", "1234567", "12345a", "١٢٣٤٥٦", "", "https://attacker.example"])
      expect(scannedConnection(value)).toBeNull();
  });

  test("only exact codes at the configured origin bypass a new consent prompt", () => {
    const trusted = new Set<string>();
    const target = connectionTarget("001234", configured);
    expect(needsConnectionConsent("001234", target, trusted, configured)).toBe(false);
    expect(needsConnectionConsent(" 001234 ", target, trusted, configured)).toBe(false);
    expect(needsConnectionConsent(link, target, trusted, configured)).toBe(true);
    expect(needsConnectionConsent("1234567", target, trusted, configured)).toBe(true);
    const external = new URL("https://external.example");
    expect(needsConnectionConsent("001234", external, trusted, configured)).toBe(true);
    expect(needsConnectionConsent(link, external, trusted, configured)).toBe(true);
    trusted.add(external.origin);
    expect(needsConnectionConsent(link, external, trusted, configured)).toBe(false);
    expect(needsConnectionConsent("001234", external, trusted, configured)).toBe(true);
  });
});
