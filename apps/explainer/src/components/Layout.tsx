import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { C, FONT, MONO } from "../theme/tokens";
import { useIn } from "../hooks/useIn";

/** Fade + rise in. Never from nothing: starts at 0.96 scale / 16px down. */
interface IAppear {
  delay?: number;
  children: ReactNode;
  style?: CSSProperties;
}
export function Appear(props: IAppear) {
  const { delay = 0, children, style } = props;
  const p = useIn(delay);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px) scale(${0.96 + p * 0.04})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface IScene {
  title: string;
  kicker: string;
  children: ReactNode;
}
export function Scene(props: IScene) {
  const { title, kicker, children } = props;
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: C.bg,
        fontFamily: FONT,
        color: C.fg,
        opacity: out,
      }}
    >
      <div style={{ position: "absolute", left: 120, top: 90 }}>
        <Appear>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: C.accent,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {kicker}
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.2, marginTop: 8 }}>
            {title}
          </div>
        </Appear>
      </div>
      {children}
      <div
        style={{
          position: "absolute",
          bottom: 35,
          left: 120,
          right: 120,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 18,
          color: C.muted,
        }}
      >
        <span style={{ fontWeight: 750, letterSpacing: -0.4 }}>Buzzzz</span>
        <span>Studio · UI illustrations</span>
      </div>
    </div>
  );
}

interface ICard {
  x: number;
  y: number;
  w: number;
  h?: number;
  children: ReactNode;
  style?: CSSProperties;
}
export function Card(props: ICard) {
  const { x, y, w, h, children, style } = props;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: C.panel,
        border: `1.5px solid ${C.line}`,
        borderRadius: 14,
        boxShadow: "-3px 3px 0 rgba(56, 172, 221, 0.28)",
        padding: 28,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface IPill {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}
export function Pill(props: IPill) {
  const { children, color = C.accent, style } = props;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 10%, rgba(0, 0, 0, 0))`,
        color,
        fontWeight: 600,
        fontSize: 22,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

interface ICode {
  children: ReactNode;
  style?: CSSProperties;
}
export function Code(props: ICode) {
  const { children, style } = props;
  return (
    <pre
      style={{
        margin: 0,
        fontFamily: MONO,
        fontSize: 22,
        lineHeight: 1.55,
        color: C.fg2,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {children}
    </pre>
  );
}
