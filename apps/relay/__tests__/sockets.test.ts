import { expect, test } from "bun:test";
import { socketCloseCode } from "../src/socketClose.ts";

test.each([1004, 1005, 1006, 1015, 0, 5000])("normalizes reserved close code%s", (code) => {
  expect(socketCloseCode(code)).toBe(1000);
});
test.each([1000, 1001, 1008, 1011, 4401, 4429])("preserves valid close code%s", (code) => {
  expect(socketCloseCode(code)).toBe(code);
});
