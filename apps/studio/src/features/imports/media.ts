import { readAudioMetadata } from "../audio/metadata";
import { readAnimationFile } from "../animation/import";
import { MAX_MEMBER_BYTES } from "./archive";
import { audioSignature, isZip } from "./signatures";

interface IMediaValidation {
  type: string;
  extension: string;
  durationMs?: number;
  frameRate?: number;
  totalFrames?: number;
}
export async function validateMediaFile(
  file: File,
  kind: "audio" | "animation",
): Promise<IMediaValidation> {
  if (!file.size || file.size > MAX_MEMBER_BYTES)
    throw new Error("Media files must contain data and be 20 MB or smaller");
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (kind === "audio") {
    const signature = audioSignature(head);
    if (!signature) throw new Error("The audio attachment has no supported audio signature");
    const metadata = await readAudioMetadata(file);
    return { ...signature, durationMs: metadata.durationMs };
  }
  const bundle = await readAnimationFile(file);
  const document = (
    bundle.animations.find((animation) => animation.id === bundle.initialId) ?? bundle.animations[0]
  ).document;
  const { durationMs, frameRate } = document;
  const totalFrames = (durationMs / 1000) * frameRate;
  for (const url of bundle.assetUrls) URL.revokeObjectURL(url);
  return isZip(head)
    ? { type: "application/zip+dotlottie", extension: "lottie", durationMs, frameRate, totalFrames }
    : { type: "application/json", extension: "json", durationMs, frameRate, totalFrames };
}
