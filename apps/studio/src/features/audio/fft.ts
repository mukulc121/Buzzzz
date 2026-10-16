export function createFft(size: number) {
  const input = new Float64Array(size);
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  const reversed = new Uint32Array(size);
  const cosine = new Float64Array(size / 2);
  const sine = new Float64Array(size / 2);
  const bits = Math.log2(size);
  for (let i = 0; i < size; i++) {
    let index = i;
    let reverse = 0;
    for (let bit = 0; bit < bits; bit++) {
      reverse = reverse * 2 + (index & 1);
      index >>>= 1;
    }
    reversed[i] = reverse;
  }
  for (let i = 0; i < size / 2; i++) {
    cosine[i] = Math.cos((-2 * Math.PI * i) / size);
    sine[i] = Math.sin((-2 * Math.PI * i) / size);
  }
  return {
    input,
    power(output: Float32Array) {
      for (let i = 0; i < size; i++) real[reversed[i]] = input[i];
      imaginary.fill(0);
      for (let length = 2; length <= size; length *= 2) {
        const half = length / 2;
        const stride = size / length;
        for (let start = 0; start < size; start += length) {
          for (let j = 0; j < half; j++) {
            const left = start + j;
            const right = left + half;
            const twiddle = j * stride;
            const r = real[right] * cosine[twiddle] - imaginary[right] * sine[twiddle];
            const im = real[right] * sine[twiddle] + imaginary[right] * cosine[twiddle];
            real[right] = real[left] - r;
            imaginary[right] = imaginary[left] - im;
            real[left] += r;
            imaginary[left] += im;
          }
        }
      }
      const scale = 4 / (size * size);
      for (let bin = 0; bin < output.length; bin++)
        output[bin] = (real[bin] ** 2 + imaginary[bin] ** 2) * scale;
    },
  };
}
