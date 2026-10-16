export function derivative(values: Float32Array, seconds: number): Float32Array {
  return values.map((_, index) => {
    const left = Math.max(0, index - 1);
    const right = Math.min(values.length - 1, index + 1);
    return (values[right] - values[left]) / ((right - left) * seconds || seconds);
  });
}

export function centeredAverage(values: Float32Array, width: number): Float32Array {
  if (width <= 1) return values;
  const radius = Math.floor(width / 2);
  const output = new Float32Array(values.length);
  let sum = 0;
  let count = Math.min(values.length, radius + 1);
  for (let index = 0; index < count; index++) sum += values[index];
  for (let index = 0; index < values.length; index++) {
    output[index] = sum / count;
    if (index >= radius) {
      sum -= values[index - radius];
      count--;
    }
    if (index + radius + 1 < values.length) {
      sum += values[index + radius + 1];
      count++;
    }
  }
  return output;
}

export function normalize(values: Float32Array): Float32Array {
  let maximum = 0;
  for (const value of values) maximum = Math.max(maximum, value);
  return maximum > 0 ? values.map((value) => value / maximum) : new Float32Array(values.length);
}

export function peaks(values: Float32Array, stepMs: number, threshold: number, gapMs: number) {
  const gap = Math.max(1, Math.round(gapMs / stepMs));
  const result: number[] = [];
  for (let index = 1; index < values.length - 1; index++) {
    if (
      values[index] < threshold ||
      values[index] <= values[index - 1] ||
      values[index] < values[index + 1]
    )
      continue;
    const previous = result.at(-1);
    if (previous !== undefined && index - previous < gap) {
      if (values[index] > values[previous]) result[result.length - 1] = index;
    } else result.push(index);
  }
  return result;
}
