const HAPTIC_MIN_HZ = 60;
const HAPTIC_MAX_HZ = 300;
const BRIGHTNESS_MIN_HZ = 200;
const BRIGHTNESS_MAX_HZ = 4000;

// Actuator frequency in Hz onto the 0-1 haptic frequency axis (log 60-300 Hz).
export function hapticFrequency(hz: number) {
  const low = Math.log2(HAPTIC_MIN_HZ);
  const high = Math.log2(HAPTIC_MAX_HZ);
  const value =
    (Math.log2(Math.min(Math.max(hz, HAPTIC_MIN_HZ), HAPTIC_MAX_HZ)) - low) / (high - low);
  return Math.min(1, Math.max(0, value));
}

// Squeezes a log Hz range onto the haptic band, holding the last voiced value.
export function rangeToHaptic(values: Float32Array, minHz: number, maxHz: number) {
  const low = Math.log2(minHz);
  const high = Math.log2(maxHz);
  const output = new Float32Array(values.length);
  let current = 0.5;
  for (let index = 0; index < values.length; index += 1) {
    const hz = values[index];
    if (hz > 0) {
      const position = (Math.log2(Math.min(Math.max(hz, minHz), maxHz)) - low) / (high - low);
      current = hapticFrequency(HAPTIC_MIN_HZ + position * (HAPTIC_MAX_HZ - HAPTIC_MIN_HZ));
    }
    output[index] = current;
  }
  return output;
}

export function brightnessToHaptic(centroidHz: Float32Array) {
  return rangeToHaptic(centroidHz, BRIGHTNESS_MIN_HZ, BRIGHTNESS_MAX_HZ);
}
