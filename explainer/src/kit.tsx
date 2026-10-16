import type { CSSProperties, ReactNode } from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

// Same palette as the studio.
export const C = {
  bg: '#f7f7f5',
  panel: '#ffffff',
  sunken: '#f1f1ee',
  line: '#e7e6e2',
  fg: '#1a1a1c',
  fg2: '#4a4a50',
  muted: '#86858b',
  accent: '#4f46e5',
  ok: '#16a34a',
  amp: '#2f74f0',
  freq: '#d97706',
  tap: '#e11d5c',
}
export const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, system-ui, sans-serif'
export const MONO = 'ui-monospace, "SF Mono", Menlo, monospace'

/** 0→1 entrance progress, starting at `delay` frames. */
export function useIn(delay = 0, damping = 200) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config: { damping } })
}

/** Fade + rise in. Never from nothing: starts at 0.96 scale / 16px down. */
export function Appear({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  const p = useIn(delay)
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 16}px) scale(${0.96 + p * 0.04})`, ...style }}>{children}</div>
  )
}

export function Scene({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, fontFamily: FONT, color: C.fg, opacity: out }}>
      <div style={{ position: 'absolute', left: 120, top: 90 }}>
        <Appear>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.accent, letterSpacing: 1.5, textTransform: 'uppercase' }}>{kicker}</div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.2, marginTop: 8 }}>{title}</div>
        </Appear>
      </div>
      {children}
    </div>
  )
}

export function Card({ x, y, w, h, children, style }: { x: number; y: number; w: number; h?: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        background: C.panel, border: `1.5px solid ${C.line}`, borderRadius: 22,
        boxShadow: '0 2px 4px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.06)', padding: 28, boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Pill({ children, color = C.accent, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 999, background: `${color}14`, color, fontWeight: 600, fontSize: 22, ...style }}>
      {children}
    </span>
  )
}

export function Code({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <pre style={{ margin: 0, fontFamily: MONO, fontSize: 22, lineHeight: 1.55, color: C.fg2, whiteSpace: 'pre', ...style }}>{children}</pre>
  )
}

/** A dot travelling from (x1,y1) to (x2,y2) between frames `from` and `to`, with an optional label. */
export function Packet({ x1, y1, x2, y2, from, to, color = C.accent, label }: { x1: number; y1: number; x2: number; y2: number; from: number; to: number; color?: string; label?: string }) {
  const frame = useCurrentFrame()
  if (frame < from || frame > to + 8) return null
  const t = interpolate(frame, [from, to], [0, 1], { extrapolateRight: 'clamp', easing: (v) => 1 - Math.pow(1 - v, 3) })
  const fade = interpolate(frame, [to, to + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const x = x1 + (x2 - x1) * t
  const y = y1 + (y2 - y1) * t
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: fade, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {label && <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color, background: C.panel, border: `1.5px solid ${color}40`, padding: '4px 12px', borderRadius: 10, whiteSpace: 'nowrap', marginTop: -70 }}>{label}</div>}
      <div style={{ width: 22, height: 22, borderRadius: 11, background: color, boxShadow: `0 0 0 8px ${color}22` }} />
    </div>
  )
}

/** Horizontal or diagonal connector line. */
export function Line({ x1, y1, x2, y2, delay = 0, dashed }: { x1: number; y1: number; x2: number; y2: number; delay?: number; dashed?: boolean }) {
  const p = useIn(delay)
  const len = Math.hypot(x2 - x1, y2 - y1)
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  return (
    <div
      style={{
        position: 'absolute', left: x1, top: y1, width: len * p, height: 0,
        borderTop: `3px ${dashed ? 'dashed' : 'solid'} ${C.line}`, transformOrigin: '0 0', transform: `rotate(${angle}deg)`,
      }}
    />
  )
}
