import { expect, test } from "bun:test";
import { formatMediaSize } from "../src/features/media/formatMediaSize";

test("media sizes show empty storage accurately and retain useful units", () => {
  expect([0, 512, 1024, 1536, 1024 ** 2, 100 * 1024 ** 2].map(formatMediaSize)).toEqual([
    "0 B",
    "512 B",
    "1 KB",
    "2 KB",
    "1 MiB",
    "100 MiB",
  ]);
});
