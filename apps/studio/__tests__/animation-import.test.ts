import { expect, spyOn, test } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { readAnimationFile } from "../src/features/animation/import";

const document = { v: "5.12.2", fr: 60, ip: 0, op: 60, w: 100, h: 100, layers: [] };
const content = strToU8(JSON.stringify(document));
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const image = Uint8Array.from(atob(png), (char) => char.charCodeAt(0));
function packageWithImage(asset: Record<string, unknown>) {
  return new Blob([
    zipSync({
      "manifest.json": strToU8(
        JSON.stringify({
          version: "2",
          initial: { animation: "safe" },
          animations: [{ id: "safe" }, { id: "other" }],
        }),
      ),
      "a/safe.json": content,
      "a/other.json": strToU8(JSON.stringify({ ...document, assets: [asset] })),
      "i/image.png": image,
    }).slice(),
  ]);
}

test("content detection loads raw Lottie JSON without trusting the extension", async () => {
  const result = await readAnimationFile(new Blob([content]));
  expect(result.animations).toHaveLength(1);
  expect(result.animations[0].document.durationMs).toBe(1000);
  await expect(readAnimationFile(new Blob(["not JSON"]))).rejects.toBeInstanceOf(Error);
  await expect(readAnimationFile(new Blob([]))).rejects.toThrow("contain data");
});

test("dotLottie v1 and v2 manifests select actual archive animations", async () => {
  const v1 = zipSync({
    "manifest.json": strToU8(JSON.stringify({ version: "1.0", animations: [{ id: "one" }] })),
    "animations/one.json": content,
  });
  const first = await readAnimationFile(new Blob([v1.slice()]));
  expect(first.initialId).toBe("one");
  const v2 = zipSync({
    "manifest.json": strToU8(
      JSON.stringify({
        version: "2",
        initial: { animation: "two" },
        animations: [{ id: "one" }, { id: "two" }],
      }),
    ),
    "a/one.json": content,
    "a/two.json": strToU8(JSON.stringify({ ...document, op: 120 })),
  });
  const second = await readAnimationFile(new Blob([v2.slice()]));
  expect(second.initialId).toBe("two");
  expect(second.animations[1].document.durationMs).toBe(2000);
});

test("malformed packages reject missing manifest, missing data and duplicate IDs", async () => {
  const missingManifest = zipSync({ "a/one.json": content });
  await expect(readAnimationFile(new Blob([missingManifest.slice()]))).rejects.toThrow(
    "manifest.json",
  );
  const missingData = zipSync({
    "manifest.json": strToU8(JSON.stringify({ version: "2", animations: [{ id: "one" }] })),
  });
  await expect(readAnimationFile(new Blob([missingData.slice()]))).rejects.toThrow("missing");
  const duplicate = zipSync({
    "manifest.json": strToU8(
      JSON.stringify({ version: "2", animations: [{ id: "one" }, { id: "one" }] }),
    ),
    "a/one.json": content,
  });
  await expect(readAnimationFile(new Blob([duplicate.slice()]))).rejects.toThrow("duplicate");
});

test("external image references reject in every package animation before local fallback", async () => {
  for (const asset of [
    { p: "https://example.invalid/image.png" },
    { p: "//example.invalid/image.png", e: 1 },
    { p: "file:///tmp/image.png", e: 1 },
    { p: "blob:untrusted", e: 1 },
    { u: "https://example.invalid/", p: "image.png", e: 1 },
    { u: " https://example.invalid/", p: "image.png" },
    { u: "h\nttps://example.invalid/", p: "image.png" },
  ])
    await expect(readAnimationFile(packageWithImage(asset))).rejects.toThrow(
      "External Lottie image",
    );
  await expect(
    readAnimationFile(
      new Blob([
        JSON.stringify({
          ...document,
          assets: [{ p: "image.png", u: "https://example.invalid/" }],
        }),
      ]),
    ),
  ).rejects.toThrow("External Lottie image");
});

test("embedded images require a bounded raster format and actual matching signature", async () => {
  for (const p of [
    "data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/png;base64,YmFk",
  ])
    await expect(readAnimationFile(packageWithImage({ p, e: 1 }))).rejects.toBeInstanceOf(Error);
  const decode = spyOn(globalThis, "atob");
  try {
    await expect(
      readAnimationFile(
        packageWithImage({ p: `data:image/png;base64,${"A".repeat(2800000)}`, e: 1 }),
      ),
    ).rejects.toThrow("2 MB");
    expect(decode).not.toHaveBeenCalled();
  } finally {
    decode.mockRestore();
  }
  const embedded = await readAnimationFile(
    packageWithImage({ p: `data:image/png;base64,${png}`, e: 1 }),
  );
  expect(embedded.animations).toHaveLength(2);
  expect(embedded.assetUrls).toHaveLength(0);
  const local = await readAnimationFile(packageWithImage({ p: "image.png", u: "../images/" }));
  expect(local.assetUrls).toHaveLength(1);
  expect(JSON.stringify(local.animations[1].document.data)).toContain(local.assetUrls[0]);
  for (const url of local.assetUrls) URL.revokeObjectURL(url);
});
