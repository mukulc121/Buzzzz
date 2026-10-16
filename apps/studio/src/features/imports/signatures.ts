const text = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));
export const isRive = (bytes: Uint8Array) => text(bytes, 0, 4) === "RIVE";
export const isZip = (bytes: Uint8Array) =>
  bytes[0] === 80 &&
  bytes[1] === 75 &&
  ((bytes[2] === 3 && bytes[3] === 4) || (bytes[2] === 5 && bytes[3] === 6));

export function audioSignature(bytes: Uint8Array) {
  if (bytes.length < 12) return null;
  if (["RIFF", "RF64"].includes(text(bytes, 0, 4)) && text(bytes, 8, 4) === "WAVE")
    return { type: "audio/wav", extension: "wav" };
  if (text(bytes, 0, 4) === "OggS") return { type: "audio/ogg", extension: "ogg" };
  if (text(bytes, 0, 4) === "fLaC") return { type: "audio/flac", extension: "flac" };
  if (text(bytes, 0, 3) === "ID3" && bytes[3] >= 2 && bytes[3] <= 4)
    return { type: "audio/mpeg", extension: "mp3" };
  if (
    bytes[0] === 255 &&
    (bytes[1] & 224) === 224 &&
    ((bytes[1] >> 3) & 3) !== 1 &&
    ((bytes[1] >> 1) & 3) !== 0 &&
    bytes[2] >> 4 !== 15 &&
    bytes[2] >> 4 !== 0 &&
    ((bytes[2] >> 2) & 3) !== 3
  )
    return { type: "audio/mpeg", extension: "mp3" };
  if (bytes[0] === 255 && (bytes[1] & 246) === 240) return { type: "audio/aac", extension: "aac" };
  if (text(bytes, 4, 4) === "ftyp" && /^M4[AB] /.test(text(bytes, 8, 4)))
    return { type: "audio/mp4", extension: "m4a" };
  return null;
}
