import type { IEditorTarget } from "./target";

export class CommandError extends Error {}

export function requireWriter(target: IEditorTarget): void {
  if (!target.document.isWriter)
    throw new CommandError(
      "This editor window is read-only. Choose Edit here in Studio, then retry",
    );
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new CommandError("The command was cancelled before it finished");
}

export function choose<T extends string>(
  value: string | undefined,
  items: readonly { id: T }[],
  label: string,
): T {
  if (value === undefined) return items[0].id;
  const found = items.find((item) => item.id === value);
  if (!found)
    throw new CommandError(
      `Unknown ${label} "${value}". Use ${items.map((item) => item.id).join(", ")}`,
    );
  return found.id;
}

const round = (value: number) => Math.round(value * 10000) / 10000;

// Bucket means keep long analyses well inside the 1 MiB result limit.
export function summarize(values: readonly number[], points = 256) {
  if (!values.length) return { min: 0, max: 0, mean: 0, seriesStepFrames: 1, series: [] };
  const size = Math.max(1, Math.ceil(values.length / points));
  const series: number[] = [];
  for (let start = 0; start < values.length; start += size) {
    const bucket = values.slice(start, start + size);
    series.push(round(bucket.reduce((sum, value) => sum + value, 0) / bucket.length));
  }
  return {
    min: round(values.reduce((low, value) => Math.min(low, value), Infinity)),
    max: round(values.reduce((high, value) => Math.max(high, value), -Infinity)),
    mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    seriesStepFrames: size,
    series,
  };
}

export function numericOptions<T extends string>(
  options: Record<string, unknown>,
  keys: readonly T[],
): Partial<Record<T, number>> {
  const result: Partial<Record<T, number>> = {};
  for (const [name, value] of Object.entries(options)) {
    const key = keys.find((item) => item === name);
    if (!key) continue;
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new CommandError(`options.${name} must be a finite number`);
    result[key] = value;
  }
  return result;
}

export function rejectUnknown(options: Record<string, unknown>, keys: readonly string[]): void {
  const unknown = Object.keys(options).find((key) => !keys.includes(key));
  if (unknown) throw new CommandError(`options.${unknown} is not a generation setting`);
}
