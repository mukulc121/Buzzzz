import { patternEnd, type Pattern } from './types'

/** Tiny static thumbnail of a pattern: intensity envelope, frequency line, taps as ticks. */
export function Spark({ pattern, w = 56, h = 22 }: { pattern: Pattern; w?: number; h?: number }) {
  const end = Math.max(patternEnd(pattern), 1)
  const x = (t: number) => (t / end) * (w - 2) + 1
  const y = (v: number) => h - 1 - v * (h - 2)
  const line = (pts: { time: number; value: number }[]) =>
    [...pts].sort((a, b) => a.time - b.time).map((p, i) => `${i ? 'L' : 'M'}${x(p.time)},${y(p.value)}`).join(' ')
  const { amplitude, frequency } = pattern.continuousPattern
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {amplitude.length > 0 && <path d={`${line(amplitude)} L${x(amplitude.at(-1)!.time)},${h} L${x(amplitude[0].time)},${h} Z`} fill="var(--amp)" fillOpacity={0.18} stroke="var(--amp)" strokeWidth={1.25} />}
      {frequency.length > 0 && <path d={line(frequency)} fill="none" stroke="var(--freq)" strokeWidth={1} strokeOpacity={0.7} />}
      {pattern.discretePattern.map((t, i) => (
        <line key={i} x1={x(t.time)} x2={x(t.time)} y1={h} y2={y(t.amplitude)} stroke="var(--tap)" strokeWidth={1.5} />
      ))}
    </svg>
  )
}
