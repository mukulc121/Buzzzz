interface IBiquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

// RBJ cookbook low-pass.
export function lowPass(hz: number, sampleRate: number, q = Math.SQRT1_2): IBiquad {
  const omega = (2 * Math.PI * hz) / sampleRate;
  const cos = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

// RBJ cookbook high-pass.
export function highPass(hz: number, sampleRate: number, q = Math.SQRT1_2): IBiquad {
  const omega = (2 * Math.PI * hz) / sampleRate;
  const cos = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: (1 + cos) / 2 / a0,
    b1: -(1 + cos) / a0,
    b2: (1 + cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

// Direct form I.
export function filter(samples: Float32Array, coefficients: IBiquad) {
  const output = new Float32Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const x = samples[index];
    const y =
      coefficients.b0 * x +
      coefficients.b1 * x1 +
      coefficients.b2 * x2 -
      coefficients.a1 * y1 -
      coefficients.a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    output[index] = y;
  }
  return output;
}
