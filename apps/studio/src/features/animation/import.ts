import { isRecord } from "@buzzzz/core";
import { strFromU8, unzipSync } from "fflate";
import { parseAnimationData } from "./document";
import type { IAnimationDocument } from "./model";

interface IAnimationPackage {
  animations: { id: string; document: IAnimationDocument }[];
  initialId: string;
  assetUrls: string[];
}
const json = (bytes: Uint8Array): unknown => JSON.parse(strFromU8(bytes));
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
function validateImage(bytes: Uint8Array, mime: string) {
  const head = String.fromCharCode(...bytes.subarray(0, 12));
  const valid =
    mime === "image/png"
      ? head.startsWith("\u0089PNG\r\n\u001a\n")
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "image/webp" && head.startsWith("RIFF") && head.endsWith("WEBP");
  if (!valid || bytes.length > MAX_IMAGE_BYTES)
    throw new Error("Lottie images must be PNG, JPEG, or WebP and no larger than 2 MB");
}
function validateEmbeddedImage(value: string) {
  if (value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64)
    throw new Error("Embedded Lottie images must be no larger than 2 MB");
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/i.exec(value);
  if (!match) throw new Error("Embed Lottie images as base64 PNG, JPEG, or WebP");
  let decoded: string;
  try {
    decoded = atob(match[2]);
  } catch {
    throw new Error("Invalid embedded Lottie image encoding");
  }
  validateImage(
    Uint8Array.from(decoded, (char) => char.charCodeAt(0)),
    match[1].toLowerCase(),
  );
}
function bindImages(
  data: Record<string, unknown>,
  files: Record<string, Uint8Array>,
  urls: string[],
  cache: Map<Uint8Array, string>,
) {
  if (!Array.isArray(data.assets)) return;
  for (const asset of data.assets) {
    if (!isRecord(asset)) continue;
    if (
      (Object.hasOwn(asset, "p") && typeof asset.p !== "string") ||
      (Object.hasOwn(asset, "u") && typeof asset.u !== "string")
    )
      throw new Error("Invalid Lottie image path");
    if (typeof asset.p !== "string") continue;
    const base = typeof asset.u === "string" ? asset.u : "";
    if (
      /\p{Cc}/u.test(base + asset.p) ||
      /^(?:[a-z][\w+.-]*:|[/\\])/i.test(base.trim()) ||
      (!asset.p.startsWith("data:") && /^(?:[a-z][\w+.-]*:|[/\\])/i.test(asset.p.trim()))
    )
      throw new Error("External Lottie image URLs are not supported; embed images in the file");
    if (asset.p.startsWith("data:")) {
      if (base) throw new Error("Embedded Lottie images must not have a path prefix");
      validateEmbeddedImage(asset.p);
      asset.e = 1;
      continue;
    }
    const name = asset.p.split("/").at(-1);
    const path = `${base}${asset.p}`.replace(/^\.\.\//, "");
    const bytes = files[path] ?? files[`i/${name}`] ?? files[`images/${name}`];
    if (!bytes) throw new Error("Lottie images must be embedded or included in the package");
    const extension = name?.split(".").at(-1)?.toLowerCase();
    const mime =
      extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "webp"
          ? "image/webp"
          : "image/png";
    validateImage(bytes, mime);
    let url = cache.get(bytes);
    if (!url) {
      url = URL.createObjectURL(new Blob([bytes.slice()], { type: mime }));
      cache.set(bytes, url);
      urls.push(url);
    }
    asset.u = "";
    asset.p = url;
    asset.e = 1;
  }
}

export async function readAnimationFile(file: Blob): Promise<IAnimationPackage> {
  if (!file.size || file.size > 50 * 1024 * 1024)
    throw new Error("Animation files must contain data and be no larger than 50 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    if (bytes.length > 8 * 1024 * 1024) throw new Error("Lottie JSON must be no larger than 8 MB");
    const data = json(bytes);
    if (!isRecord(data)) throw new Error("Lottie animation data must be an object");
    bindImages(data, {}, [], new Map());
    return {
      animations: [{ id: "animation", document: parseAnimationData(data) }],
      initialId: "animation",
      assetUrls: [],
    };
  }
  let expanded = 0;
  let count = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      if (
        !/^(manifest\.json|(?:a|animations)\/[^/]+\.json|(?:i|images)\/[^/]+\.(?:png|jpe?g|webp|svg))$/i.test(
          entry.name,
        )
      )
        return false;
      expanded += entry.originalSize;
      count++;
      if (entry.originalSize > 8 * 1024 * 1024 || expanded > 32 * 1024 * 1024 || count > 256)
        throw new Error(
          "The expanded dotLottie package exceeds the supported 32 MB or 256 file limit",
        );
      return true;
    },
  });
  if (!files["manifest.json"]) throw new Error("The dotLottie package has no manifest.json");
  const manifest = json(files["manifest.json"]);
  if (
    !isRecord(manifest) ||
    !Array.isArray(manifest.animations) ||
    !manifest.animations.length ||
    manifest.animations.length > 32
  )
    throw new Error("The dotLottie manifest must list between 1 and 32 animations");
  if (!["1", "1.0", "2", "2.0"].includes(String(manifest.version)))
    throw new Error("Only dotLottie version 1 and 2 packages are supported");
  const assetUrls: string[] = [];
  const cache = new Map<Uint8Array, string>();
  const ids = new Set<string>();
  try {
    const animations = manifest.animations.map((entry) => {
      if (
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        !/^[\w. -]+$/.test(entry.id) ||
        entry.id === "." ||
        entry.id === ".."
      )
        throw new Error("The dotLottie manifest contains an invalid animation ID");
      if (ids.has(entry.id))
        throw new Error("The dotLottie manifest contains duplicate animation IDs");
      ids.add(entry.id);
      const content = files[`a/${entry.id}.json`] ?? files[`animations/${entry.id}.json`];
      if (!content) throw new Error(`The dotLottie animation ${entry.id} is missing`);
      const data = json(content);
      if (!isRecord(data)) throw new Error("Lottie animation data must be an object");
      bindImages(data, files, assetUrls, cache);
      const document = parseAnimationData(data);
      if (manifest.themes || manifest.stateMachines)
        document.warnings.push(
          "Package themes and state machines are not applied; animation timelines play directly.",
        );
      return { id: entry.id, document };
    });
    const initial =
      isRecord(manifest.initial) && typeof manifest.initial.animation === "string"
        ? manifest.initial.animation
        : animations[0].id;
    return {
      animations,
      initialId: animations.some((animation) => animation.id === initial)
        ? initial
        : animations[0].id,
      assetUrls,
    };
  } catch (error) {
    for (const url of assetUrls) URL.revokeObjectURL(url);
    throw error;
  }
}
