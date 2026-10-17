import { expect, test } from "bun:test";
import { emptyPattern } from "@buzzzz/core";
import { strToU8, zipSync } from "fflate";
import { readAnimationFile } from "../src/features/animation/import";
import { readImport } from "../src/features/imports/readImport";

const document = { fr: 60, ip: 0, op: 60, w: 100, h: 100, layers: [] };
const json = (value: unknown) => strToU8(JSON.stringify(value));
test("present non-string image paths reject before Lottie can coerce them into URLs", async () => {
  for (const value of [null, 1, true, {}, [], ["https://example.invalid/image.png"]]) {
    for (const field of ["p", "u"]) {
      const data = { ...document, assets: [{ id: "image", e: 1, p: "image.png", [field]: value }] };
      await expect(readAnimationFile(new Blob([json(data)]))).rejects.toThrow(
        "Invalid Lottie image path",
      );
      const archive = zipSync({
        "manifest.json": json({ version: "2", animations: [{ id: "safe" }, { id: "bad" }] }),
        "a/safe.json": json(document),
        "a/bad.json": json(data),
      });
      await expect(readAnimationFile(new Blob([archive.slice()]))).rejects.toThrow(
        "Invalid Lottie image path",
      );
    }
  }
  const withoutP = { ...document, assets: [{ id: "image", u: ["https://example.invalid/"] }] };
  await expect(readAnimationFile(new Blob([json(withoutP)]))).rejects.toThrow(
    "Invalid Lottie image path",
  );
});

test("portable bundle animation validation rejects coercible image paths too", async () => {
  const data = {
    ...document,
    assets: [{ id: "image", e: 1, p: ["https://example.invalid/image.png"] }],
  };
  const archive = zipSync({
    "manifest.json": json({
      schema: "pulsar.bundle/1",
      presets: [
        {
          id: "one",
          name: "One",
          haptics: "haptics/one.json",
          animation: { src: "animation/one.json" },
        },
      ],
    }),
    "haptics/one.json": json(emptyPattern()),
    "animation/one.json": json(data),
  });
  await expect(readImport(new File([archive.slice()], "invalid.pulsar"))).rejects.toThrow(
    "Invalid Lottie image path",
  );
});
