const twiddles = new Map<number, { cos: Float32Array; sin: Float32Array }>();

function twiddle(size: number) {
  let table = twiddles.get(size);
  if (!table) {
    const cos = new Float32Array(size / 2);
    const sin = new Float32Array(size / 2);
    for (let index = 0; index < size / 2; index += 1) {
      cos[index] = Math.cos((-2 * Math.PI * index) / size);
      sin[index] = Math.sin((-2 * Math.PI * index) / size);
    }
    table = { cos, sin };
    twiddles.set(size, table);
  }
  return table;
}

// In-place radix-2 FFT over Float32 real and imaginary buffers.
export function fft(real: Float32Array, imaginary: Float32Array) {
  const size = real.length;
  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]];
    }
  }
  const { cos, sin } = twiddle(size);
  for (let length = 2; length <= size; length <<= 1) {
    const half = length >> 1;
    const stride = size / length;
    for (let start = 0; start < size; start += length)
      for (let offset = 0, table = 0; offset < half; offset += 1, table += stride) {
        const c = cos[table];
        const s = sin[table];
        const even = start + offset;
        const odd = even + half;
        const re = real[odd] * c - imaginary[odd] * s;
        const im = real[odd] * s + imaginary[odd] * c;
        real[odd] = real[even] - re;
        imaginary[odd] = imaginary[even] - im;
        real[even] += re;
        imaginary[even] += im;
      }
  }
}

export function hann(size: number) {
  const window = new Float32Array(size);
  for (let index = 0; index < size; index += 1)
    window[index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / size));
  return window;
}
