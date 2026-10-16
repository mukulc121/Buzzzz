import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import type { Layer, Pattern } from './types'

export type Selection = { layer: Layer; index: number } | null

type Props = {
  pattern: Pattern
  layer: Layer
  viewMs: number
  selected: Selection
  playhead: number | null
  onSelect: (s: Selection) => void
  /** Called once before a mutation starts, so the caller can snapshot for undo. */
  onBegin: () => void
  onChange: (p: Pattern) => void
}

const PAD = 28
export const COLORS: Record<Layer, string> = {
  amplitude: 'var(--amp)',
  frequency: 'var(--freq)',
  discrete: 'var(--tap)',
}

const niceStep = (span: number) => [10, 25, 50, 100, 250, 500, 1000, 2000, 5000].find((s) => span / s <= 12) ?? 10000

export function Chart({ pattern, layer, viewMs, selected, playhead, onSelect, onBegin, onChange }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [{ w, h: H }, setSize] = useState({ w: 800, h: 320 })
  const drag = useRef<{ layer: Layer; index: number } | null>(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: Math.max(240, e.contentRect.height) }))
    ro.observe(svg.current!)
    return () => ro.disconnect()
  }, [])

  const x = (t: number) => PAD + (t / viewMs) * (w - 2 * PAD)
  const y = (v: number) => PAD + (1 - v) * (H - 2 * PAD)
  const toData = (e: MouseEvent) => {
    const r = svg.current!.getBoundingClientRect()
    const t = ((e.clientX - r.left - PAD) / (w - 2 * PAD)) * viewMs
    const v = 1 - (e.clientY - r.top - PAD) / (H - 2 * PAD)
    return { t: Math.max(0, Math.round(t)), v: Math.min(1, Math.max(0, v)) }
  }

  const add = (e: MouseEvent) => {
    if ((e.target as Element).closest('.handle')) return
    const { t, v } = toData(e)
    onBegin()
    const p = structuredClone(pattern)
    if (layer === 'discrete') {
      p.discretePattern.push({ time: t, amplitude: v, frequency: 0.5 })
      onSelect({ layer, index: p.discretePattern.length - 1 })
    } else {
      p.continuousPattern[layer].push({ time: t, value: v })
      onSelect({ layer, index: p.continuousPattern[layer].length - 1 })
    }
    onChange(p)
  }

  const move = (e: PointerEvent) => {
    if (!drag.current) return
    const { t, v } = toData(e)
    const { layer: l, index } = drag.current
    const p = structuredClone(pattern)
    if (l === 'discrete') Object.assign(p.discretePattern[index], { time: t, amplitude: v })
    else p.continuousPattern[l][index] = { time: t, value: v }
    onChange(p)
  }

  const grab = (l: Layer, index: number) => (e: PointerEvent) => {
    if (l !== layer) return
    e.stopPropagation()
    onBegin()
    onSelect({ layer: l, index })
    drag.current = { layer: l, index }
    svg.current!.setPointerCapture(e.pointerId)
  }

  const envelope = (l: 'amplitude' | 'frequency') => {
    const pts = pattern.continuousPattern[l].map((p, i) => ({ ...p, i })).sort((a, b) => a.time - b.time)
    const active = l === layer
    return (
      <g key={l} opacity={active ? 1 : 0.35}>
        {pts.length > 0 && (
          <path
            d={`M${x(pts[0].time)},${y(0)} ` + pts.map((p) => `L${x(p.time)},${y(p.value)}`).join(' ') + ` L${x(pts.at(-1)!.time)},${y(0)} Z`}
            fill={COLORS[l]}
            fillOpacity={0.12}
            stroke={COLORS[l]}
            strokeWidth={2}
          />
        )}
        {active &&
          pts.map((p) => (
            <circle
              key={p.i}
              className="handle"
              cx={x(p.time)}
              cy={y(p.value)}
              r={selected?.layer === l && selected.index === p.i ? 7 : 5}
              fill={selected?.layer === l && selected.index === p.i ? 'var(--fg)' : COLORS[l]}
              onPointerDown={grab(l, p.i)}
            />
          ))}
      </g>
    )
  }

  const step = niceStep(viewMs)
  const ticks = Array.from({ length: Math.floor(viewMs / step) + 1 }, (_, i) => i * step)

  return (
    <svg
      ref={svg}
      className="chart"
      onDoubleClick={add}
      onPointerDown={() => onSelect(null)}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={PAD} y2={H - PAD} className="grid" />
          <text x={x(t)} y={H - 8} className="tick">{t}</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={PAD} x2={w - PAD} y1={y(v)} y2={y(v)} className="grid" />
          <text x={4} y={y(v) + 4} className="tick">{v * 100}</text>
        </g>
      ))}
      {envelope('amplitude')}
      {envelope('frequency')}
      <g opacity={layer === 'discrete' ? 1 : 0.35}>
        {pattern.discretePattern.map((tap, i) => {
          const sel = selected?.layer === 'discrete' && selected.index === i
          return (
            <g key={i} onPointerDown={grab('discrete', i)} className={layer === 'discrete' ? 'handle' : ''}>
              <line x1={x(tap.time)} x2={x(tap.time)} y1={y(0)} y2={y(tap.amplitude)} stroke={COLORS.discrete} strokeWidth={3} />
              <circle cx={x(tap.time)} cy={y(tap.amplitude)} r={sel ? 7 : 5} fill={sel ? 'var(--fg)' : COLORS.discrete} />
            </g>
          )
        })}
      </g>
      {playhead !== null && <line x1={x(playhead)} x2={x(playhead)} y1={PAD} y2={H - PAD} className="playhead" />}
    </svg>
  )
}
