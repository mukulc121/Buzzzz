function invalidWave(): never {
  throw new Error("The WAV container, chunk lengths, or PCM format fields are inconsistent");
}

export async function validateWaveContainer(file: Blob): Promise<void> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const header = String.fromCharCode(...head.subarray(0, 4));
  if (!["RIFF", "RIFX", "RF64"].includes(header)) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 12 || String.fromCharCode(...bytes.subarray(8, 12)) !== "WAVE") invalidWave();
  const view = new DataView(bytes.buffer);
  const little = header !== "RIFX";
  const rf64 = header === "RF64";
  const outerSize = view.getUint32(4, little);
  if (rf64 ? outerSize !== 0xffffffff : outerSize !== bytes.length - 8) invalidWave();
  let position = 12;
  let dataSize64: number | undefined;
  let sampleCount64: bigint | undefined;
  let dataSize: number | undefined;
  let blockAlign: number | undefined;
  let factSamples: number | undefined;
  while (position < bytes.length) {
    if (position + 8 > bytes.length) invalidWave();
    const id = String.fromCharCode(...bytes.subarray(position, position + 4));
    const start = position + 8;
    let size = view.getUint32(position + 4, little);
    if (rf64 && position === 12 && id !== "ds64") invalidWave();
    if (id === "data" && rf64) {
      if (size !== 0xffffffff || dataSize64 === undefined) invalidWave();
      size = dataSize64;
    }
    const end = start + size;
    const paddedEnd = end + (size % 2);
    if (end > bytes.length || paddedEnd > bytes.length) invalidWave();
    if (id === "ds64") {
      if (!rf64 || position !== 12 || size < 28 || view.getUint32(start + 24, true) !== 0)
        invalidWave();
      if (view.getBigUint64(start, true) !== BigInt(bytes.length - 8)) invalidWave();
      const data = view.getBigUint64(start + 8, true);
      if (data > BigInt(bytes.length)) invalidWave();
      dataSize64 = Number(data);
      sampleCount64 = view.getBigUint64(start + 16, true);
    } else if (id === "fmt ") {
      if (blockAlign !== undefined || (size !== 14 && size < 16)) invalidWave();
      let tag = view.getUint16(start, little);
      const channels = view.getUint16(start + 2, little);
      const sampleRate = view.getUint32(start + 4, little);
      const byteRate = view.getUint32(start + 8, little);
      const align = view.getUint16(start + 12, little);
      const bits = size === 14 ? 8 : view.getUint16(start + 14, little);
      if (size >= 18 && view.getUint16(start + 16, little) > size - 18) invalidWave();
      if (tag === 0xfffe) {
        if (!little || size < 40 || view.getUint16(start + 16, true) < 22) invalidWave();
        const guid = bytes.subarray(start + 26, start + 40);
        if (
          !guid.every(
            (value, index) => value === [0, 0, 0, 0, 16, 0, 128, 0, 0, 170, 0, 56, 155, 113][index],
          )
        )
          invalidWave();
        tag = view.getUint16(start + 24, true);
      }
      const validBits =
        tag === 1
          ? [8, 16, 24, 32].includes(bits)
          : tag === 3
            ? [32, 64].includes(bits)
            : (tag === 6 || tag === 7) && bits === 8;
      if (
        !validBits ||
        !channels ||
        !sampleRate ||
        align !== (channels * bits) / 8 ||
        byteRate !== sampleRate * align
      )
        invalidWave();
      blockAlign = align;
    } else if (id === "data") {
      if (dataSize !== undefined) invalidWave();
      dataSize = size;
    } else if (id === "fact") {
      if (factSamples !== undefined || size < 4) invalidWave();
      factSamples = view.getUint32(start, little);
    }
    position = paddedEnd;
  }
  if (blockAlign === undefined || dataSize === undefined || !dataSize || dataSize % blockAlign)
    invalidWave();
  const frames = dataSize / blockAlign;
  if (factSamples && factSamples !== frames && !(rf64 && factSamples === 0xffffffff)) invalidWave();
  if (sampleCount64 && sampleCount64 !== BigInt(frames)) invalidWave();
}
