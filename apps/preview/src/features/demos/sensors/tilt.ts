import { clamp01 } from "../shared/patterns";

interface IReading {
  x: number;
  y: number;
  z: number;
}

const DEAD_ZONE = 0.08;

// Tilt (sideways gravity) sets pitch; shaking (deviation from 1g) adds strength.
export function tiltFeel(reading: IReading) {
  const { x, y, z } = reading;
  const tilt = clamp01(Math.hypot(x, y));
  const shake = clamp01(Math.abs(Math.hypot(x, y, z) - 1) * 1.5);
  const strength = Math.max(tilt * 0.6, shake);
  return {
    amplitude: strength < DEAD_ZONE ? 0 : Math.round(strength * 100) / 100,
    frequency: Math.round((0.2 + 0.7 * tilt) * 100) / 100,
  };
}
