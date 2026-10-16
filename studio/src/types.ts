// Pulsar's device pattern format — identical to `Pattern` in react-native-pulsar's types.ts.
// Times in ms, all values 0–1.
export type Tap = { time: number; amplitude: number; frequency: number }
export type Point = { time: number; value: number }
export type Pattern = {
  discretePattern: Tap[]
  continuousPattern: { amplitude: Point[]; frequency: Point[] }
}

export type Layer = 'amplitude' | 'frequency' | 'discrete'

export type Preset = { id: string; name: string; pattern: Pattern }

export type Project = {
  presets: Preset[]
  /** Rive view-model trigger name → preset id */
  map: Record<string, string>
}

// Relay messages. Studio → phone: load / map / play / fire / restart / pause. Phone → studio: hello / fired.
export type Msg =
  | { type: 'load'; riv: string; stateMachine?: string; map: Record<string, Pattern> }
  | { type: 'map'; map: Record<string, Pattern> }
  | { type: 'play'; pattern: Pattern }
  | { type: 'fire'; name: string }
  | { type: 'restart' }
  | { type: 'pause'; paused: boolean }
  | { type: 'hello'; device: string }
  | { type: 'fired'; name: string }
  | { type: 'peers'; phones: number }

export const emptyPattern = (): Pattern => ({
  discretePattern: [],
  continuousPattern: { amplitude: [], frequency: [] },
})

const byTime = (a: { time: number }, b: { time: number }) => a.time - b.time
const r = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d
const clamp = (n: number) => Math.min(1, Math.max(0, n))

/** Sorted, clamped and rounded — what the SDK receives. */
export function toDevice(p: Pattern): Pattern {
  const pt = (x: Point) => ({ time: Math.round(x.time), value: r(clamp(x.value)) })
  return {
    discretePattern: [...p.discretePattern].sort(byTime).map((t) => ({
      time: Math.round(t.time),
      amplitude: r(clamp(t.amplitude)),
      frequency: r(clamp(t.frequency)),
    })),
    continuousPattern: {
      amplitude: [...p.continuousPattern.amplitude].sort(byTime).map(pt),
      frequency: [...p.continuousPattern.frequency].sort(byTime).map(pt),
    },
  }
}

export function isPattern(v: unknown): v is Pattern {
  const p = v as Pattern
  return (
    !!p &&
    Array.isArray(p.discretePattern) &&
    Array.isArray(p.continuousPattern?.amplitude) &&
    Array.isArray(p.continuousPattern?.frequency)
  )
}

export function patternEnd(p: Pattern): number {
  const times = [
    ...p.discretePattern,
    ...p.continuousPattern.amplitude,
    ...p.continuousPattern.frequency,
  ].map((x) => x.time)
  return times.length ? Math.max(...times) : 0
}
