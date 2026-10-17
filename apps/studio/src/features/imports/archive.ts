import { sha256 } from "../../crypto";
import { isRecord } from "@buzzzz/core";
import { strFromU8, strToU8, unzipSync } from "fflate";

export const MAX_MEMBER_BYTES = 20 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
export function safeArchivePath(path: string) {
  return (
    path.length > 0 &&
    path.length <= 512 &&
    !path.startsWith("/") &&
    !/^[A-Za-z]:/.test(path) &&
    !Array.from(path).some((character) => character.charCodeAt(0) < 32) &&
    !path.includes("\\") &&
    !path
      .split("/")
      .some((part) => ["..", ".", "__proto__", "prototype", "constructor"].includes(part))
  );
}
export function unpackArchive(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES)
    throw new Error("Project archives must be 32 MB or smaller");
  let count = 0;
  let expanded = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      if (!safeArchivePath(entry.name)) throw new Error("The archive contains an unsafe file path");
      count++;
      expanded += entry.originalSize;
      if (count > 1024 || entry.originalSize > MAX_MEMBER_BYTES || expanded > MAX_EXPANDED_BYTES)
        throw new Error(
          "The archive exceeds the 20 MB member, 100 MB expanded, or 1,024 file limit",
        );
      return true;
    },
  });
  const actual = Object.values(files).reduce((sum, file) => sum + file.byteLength, 0);
  if (
    actual > MAX_EXPANDED_BYTES ||
    Object.values(files).some((file) => file.byteLength > MAX_MEMBER_BYTES)
  )
    throw new Error("The expanded archive exceeds its supported size limits");
  return files;
}
export function readJson(bytes: Uint8Array): unknown {
  return JSON.parse(strFromU8(bytes));
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value))
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  const result = JSON.stringify(value);
  if (result === undefined) throw new Error("Bundle metadata contains an unsupported value");
  return result;
}
async function digest(bytes: Uint8Array) {
  return sha256(bytes.slice().buffer);
}
export async function pulsarContentHash(files: Record<string, Uint8Array>) {
  const records: string[] = [];
  for (const path of Object.keys(files).sort()) {
    let bytes = files[path];
    if (path === "manifest.json") {
      const manifest = readJson(bytes);
      if (!isRecord(manifest)) throw new Error("The bundle manifest must be an object");
      const { hash: _hash, ...metadata } = manifest;
      bytes = strToU8(canonical(metadata));
    }
    records.push(`${path}\n${await digest(bytes)}`);
  }
  return `sha256-${await digest(strToU8(records.join("\n")))}`;
}
