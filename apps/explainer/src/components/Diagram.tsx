import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "../theme/tokens";
import { useIn } from "../hooks/useIn";

/** A dot travelling from (x1,y1) to (x2,y2) between frames `from` and `to`, with an optional label. */
interface IPacket {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  from: number;
  to: number;
  color?: string;
  label?: string;
}
export function Packet(props: IPacket) {
  const { x1, y1, x2, y2, from, to, color = C.accent, label } = props;
  const frame = useCurrentFrame();
  if (frame < from || frame > to + 8) return null;
  const t = interpolate(frame, [from, to], [0, 1], {
    extrapolateRight: "clamp",
    easing: (v) => 1 - Math.pow(1 - v, 3),
  });
  const fade = interpolate(frame, [to, to + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = x1 + (x2 - x1) * t;
  const y = y1 + (y2 - y1) * t;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        opacity: fade,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 20,
            fontWeight: 600,
            color,
            background: C.panel,
            border: `1.5px solid color-mix(in srgb, ${color} 25%, rgba(0, 0, 0, 0))`,
            padding: "4px 12px",
            borderRadius: 10,
            whiteSpace: "nowrap",
            marginTop: -70,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: color,
          boxShadow: `0 0 0 8px color-mix(in srgb, ${color} 15%, rgba(0, 0, 0, 0))`,
        }}
      />
    </div>
  );
}

/** Horizontal or diagonal connector line. */
interface ILine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay?: number;
  dashed?: boolean;
}
export function Line(props: ILine) {
  const { x1, y1, x2, y2, delay = 0, dashed } = props;
  const p = useIn(delay);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <div
      style={{
        position: "absolute",
        left: x1,
        top: y1,
        width: len * p,
        height: 0,
        borderTop: `3px ${dashed ? "dashed" : "solid"} ${C.line}`,
        transformOrigin: "0 0",
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
}
