import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

test("the native Home uses Buzzzz identity and the website mark", () => {
  const home = readFileSync(
    new URL("../src/features/home/HomeScreen.tsx", import.meta.url),
    "utf8",
  );
  const mark = readFileSync(new URL("../src/components/BuzzzzMark.tsx", import.meta.url), "utf8");
  const favicon = readFileSync(new URL("../../studio/public/favicon.svg", import.meta.url), "utf8");
  expect(home).toContain("Welcome to Buzzzz!");
  expect(home).not.toContain("Welcome to Pulsar!");
  expect(home).toContain("<BuzzzzMark");
  expect(existsSync(new URL("../src/features/home/assets/logo.png", import.meta.url))).toBe(false);
  for (const match of favicon.matchAll(/(?:d|fill|stroke|rx|viewBox)="([^"]+)"/g)) {
    expect(mark).toContain(`"${match[1]}"`);
  }
  expect(mark).toContain('accessibilityLabel="Buzzzz"');
});
