export function frameRms(samples: Float32Array, size: number, hop: number) {
  const frames = Math.max(1, Math.floor((samples.length - size) / hop) + 1);
  const values = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * hop;
    const end = Math.min(start + size, samples.length);
    let sum = 0;
    for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
    values[frame] = Math.sqrt(sum / size);
  }
  return values;
}

const decibels = (value: number) => (value > 0 ? 20 * Math.log10(value) : -Infinity);

// Linear level onto 0-1 above a dB floor.
export function levelAboveFloor(value: number, floorDb = -50) {
  if (value <= 0) return 0;
  const db = decibels(value);
  return db <= floorDb ? 0 : Math.min(1, 1 - db / floorDb);
}

// One-pole attack/release follower; time constants in ms.
export function follow(values: Float32Array, stepMs: number, attackMs = 5, releaseMs = 60) {
  const attack = attackMs > 0 ? Math.exp(-stepMs / attackMs) : 0;
  const release = releaseMs > 0 ? Math.exp(-stepMs / releaseMs) : 0;
  const output = new Float32Array(values.length);
  let level = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const coefficient = value > level ? attack : release;
    level = value + coefficient * (level - value);
    output[index] = level;
  }
  return output;
}

export function normalizePeak(values: Float32Array) {
  let peak = 0;
  for (const value of values) if (value > peak) peak = value;
  if (peak <= 0) return values;
  const output = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) output[index] = values[index] / peak;
  return output;
}

// Linear resample of a frame series onto an envelope grid covering durationMs.
export function resampleSeries(
  values: Float32Array,
  stepMs: number,
  durationMs: number,
  envelopeHz: number,
) {
  const outputStepMs = 1000 / envelopeHz;
  const count = Math.max(1, Math.round(durationMs / outputStepMs) + 1);
  const output = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const position = (index * outputStepMs) / stepMs;
    const left = Math.floor(position);
    const right = Math.min(values.length - 1, left + 1);
    if (left >= values.length) output[index] = values[values.length - 1] ?? 0;
    else {
      const fraction = position - left;
      output[index] = values[left] * (1 - fraction) + values[right] * fraction;
    }
  }
  return { values: output, stepMs: outputStepMs };
}
