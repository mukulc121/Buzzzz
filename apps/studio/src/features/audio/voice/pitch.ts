const FALLBACK_THRESHOLD = 0.5;

// YIN pitch per frame in Hz, 0 when unvoiced.
export function yinPitch(
  samples: Float32Array,
  sampleRate: number,
  size: number,
  hop: number,
  minHz: number,
  maxHz: number,
  threshold = 0.15,
) {
  const frames = Math.max(1, Math.floor((samples.length - size) / hop) + 1);
  const pitch = new Float32Array(frames);
  const minLag = Math.max(2, Math.floor(sampleRate / Math.max(1, maxHz)));
  const maxLag = Math.min(size - 1, Math.floor(sampleRate / Math.max(1, minHz)));
  if (maxLag <= minLag) return pitch;
  const difference = new Float32Array(maxLag + 1);
  const normalized = new Float32Array(maxLag + 1);
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * hop;
    for (let lag = 1; lag <= maxLag; lag += 1) {
      const length = Math.min(size - lag, samples.length - start - lag);
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        const delta = samples[start + index] - samples[start + index + lag];
        sum += delta * delta;
      }
      difference[lag] = sum;
    }
    normalized[0] = 1;
    let running = 0;
    for (let lag = 1; lag <= maxLag; lag += 1) {
      running += difference[lag];
      normalized[lag] = running > 0 ? (difference[lag] * lag) / running : 1;
    }
    let period = -1;
    for (let lag = minLag; lag <= maxLag; lag += 1)
      if (normalized[lag] < threshold) {
        while (lag + 1 <= maxLag && normalized[lag + 1] < normalized[lag]) lag += 1;
        period = lag;
        break;
      }
    if (period === -1) {
      let lowest = minLag;
      for (let lag = minLag + 1; lag <= maxLag; lag += 1)
        if (normalized[lag] < normalized[lowest]) lowest = lag;
      period = normalized[lowest] < FALLBACK_THRESHOLD ? lowest : -1;
    }
    pitch[frame] = period > 0 ? sampleRate / period : 0;
  }
  return pitch;
}

export function halveRate(samples: Float32Array, factor: number) {
  const output = new Float32Array(Math.floor(samples.length / factor));
  for (let index = 0; index < output.length; index += 1) {
    const source = index * factor;
    output[index] = (samples[source] + (samples[source + 1] ?? samples[source])) * 0.5;
  }
  return output;
}
