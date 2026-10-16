import { COLORS, type Layer, type Selection } from "./model";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { MAX_PATTERN_MS, type Pattern } from "@buzzzz/core";

interface IChart {
  pattern: Pattern;
  layer: Layer;
  viewMs: number;
  selected: Selection;
  playhead: number | null;
  onSelect: (s: Selection) => void;
  /** Called once before a mutation starts, so the caller can snapshot for undo. */
  onBegin: () => void;
  onChange: (p: Pattern) => void;
}

const PAD = 28;

const niceStep = (span: number) =>
  [10, 25, 50, 100, 250, 500, 1000, 2000, 5000].find((s) => span / s <= 12) ?? 10000;

export function Chart(props: IChart) {
  const { pattern, layer, viewMs, selected, playhead, onSelect, onBegin, onChange } = props;
  const svg = useRef<SVGSVGElement>(null);
  const [{ w, h: H }, setSize] = useState({ w: 800, h: 320 });
  const drag = useRef<{ layer: Layer; index: number } | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: Math.max(240, e.contentRect.height) }),
    );
    ro.observe(svg.current!);
    return () => ro.disconnect();
  }, []);

  const x = (t: number) => PAD + (t / viewMs) * (w - 2 * PAD);
  const y = (v: number) => PAD + (1 - v) * (H - 2 * PAD);
  const toData = (e: MouseEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const t = ((e.clientX - r.left - PAD) / (w - 2 * PAD)) * viewMs;
    const v = 1 - (e.clientY - r.top - PAD) / (H - 2 * PAD);
    return {
      t: Math.min(MAX_PATTERN_MS, Math.max(0, Math.round(t))),
      v: Math.min(1, Math.max(0, v)),
    };
  };

  const add = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest(".handle")) return;
    const { t, v } = toData(e);
    onBegin();
    const p = structuredClone(pattern);
    if (layer === "discrete") {
      p.discretePattern.push({ time: t, amplitude: v, frequency: 0.5 });
      onSelect({ layer, index: p.discretePattern.length - 1 });
    } else {
      p.continuousPattern[layer].push({ time: t, value: v });
      onSelect({ layer, index: p.continuousPattern[layer].length - 1 });
    }
    onChange(p);
  };

  const move = (e: PointerEvent) => {
    if (!drag.current) return;
    const { t, v } = toData(e);
    const { layer: l, index } = drag.current;
    const p = structuredClone(pattern);
    if (l === "discrete") Object.assign(p.discretePattern[index], { time: t, amplitude: v });
    else p.continuousPattern[l][index] = { time: t, value: v };
    onChange(p);
  };

  const grab = (l: Layer, index: number) => (e: PointerEvent) => {
    if (l !== layer) return;
    e.stopPropagation();
    onBegin();
    onSelect({ layer: l, index });
    drag.current = { layer: l, index };
    svg.current!.setPointerCapture(e.pointerId);
  };

  const moveWithKeyboard =
    (targetLayer: Layer, index: number) => (event: KeyboardEvent<SVGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        onSelect({ layer: targetLayer, index });
        return;
      }
      const horizontal = event.key === "ArrowRight" || event.key === "ArrowLeft";
      const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
      if (!horizontal && !vertical) return;
      event.preventDefault();
      onBegin();
      const next = structuredClone(pattern);
      const point =
        targetLayer === "discrete"
          ? next.discretePattern[index]
          : next.continuousPattern[targetLayer][index];
      if (horizontal)
        point.time = Math.min(
          MAX_PATTERN_MS,
          Math.max(0, point.time + (event.key === "ArrowRight" ? 10 : -10)),
        );
      else {
        const delta = event.key === "ArrowUp" ? 0.01 : -0.01;
        if ("value" in point) point.value = Math.min(1, Math.max(0, point.value + delta));
        else point.amplitude = Math.min(1, Math.max(0, point.amplitude + delta));
      }
      onChange(next);
    };

  const envelope = (l: "amplitude" | "frequency") => {
    const pts = pattern.continuousPattern[l]
      .map((p, i) => ({ ...p, i }))
      .sort((a, b) => a.time - b.time);
    const active = l === layer;
    return (
      <g key={l} opacity={active ? 1 : 0.8}>
        {pts.length > 0 && (
          <path
            d={
              `M${x(pts[0].time)},${y(0)} ` +
              pts.map((p) => `L${x(p.time)},${y(p.value)}`).join(" ") +
              ` L${x(pts.at(-1)!.time)},${y(0)} Z`
            }
            fill={COLORS[l]}
            fillOpacity={0.12}
            stroke={COLORS[l]}
            strokeWidth={2.5}
            strokeDasharray={l === "frequency" ? "6 4" : undefined}
          />
        )}
        {active &&
          pts.map((p) => (
            <circle
              key={p.i}
              className="handle"
              role="button"
              tabIndex={0}
              aria-label={`${l === "amplitude" ? "Intensity" : "Frequency"} point at ${Math.round(p.time)} milliseconds, ${Math.round(p.value * 100)} percent`}
              onFocus={() => onSelect({ layer: l, index: p.i })}
              onKeyDown={moveWithKeyboard(l, p.i)}
              cx={x(p.time)}
              cy={y(p.value)}
              r={selected?.layer === l && selected.index === p.i ? 7 : 5}
              fill={selected?.layer === l && selected.index === p.i ? "var(--fg)" : COLORS[l]}
              onPointerDown={grab(l, p.i)}
            />
          ))}
      </g>
    );
  };

  const step = niceStep(viewMs);
  const ticks = Array.from({ length: Math.floor(viewMs / step) + 1 }, (_, i) => i * step);

  return (
    <svg
      ref={svg}
      className="chart"
      onDoubleClick={add}
      onPointerDown={() => onSelect(null)}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onLostPointerCapture={() => (drag.current = null)}
      role="group"
      aria-label="Haptic pattern timeline. Arrow keys move a focused point."
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={PAD} y2={H - PAD} className="grid" />
          <text x={x(t)} y={H - 8} className="tick">
            {t}
          </text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={PAD} x2={w - PAD} y1={y(v)} y2={y(v)} className="grid" />
          <text x={4} y={y(v) + 4} className="tick">
            {v * 100}
          </text>
        </g>
      ))}
      {envelope("amplitude")}
      {envelope("frequency")}
      <g opacity={layer === "discrete" ? 1 : 0.8}>
        {pattern.discretePattern.map((tap, i) => {
          const sel = selected?.layer === "discrete" && selected.index === i;
          return (
            <g
              key={i}
              role={layer === "discrete" ? "button" : "img"}
              tabIndex={layer === "discrete" ? 0 : undefined}
              aria-label={`Tap at ${Math.round(tap.time)} milliseconds, ${Math.round(tap.amplitude * 100)} percent intensity`}
              onFocus={() => onSelect({ layer: "discrete", index: i })}
              onKeyDown={moveWithKeyboard("discrete", i)}
              onPointerDown={grab("discrete", i)}
              className={layer === "discrete" ? "handle" : ""}
            >
              <line
                x1={x(tap.time)}
                x2={x(tap.time)}
                y1={y(0)}
                y2={y(tap.amplitude)}
                stroke={COLORS.discrete}
                strokeWidth={3}
              />
              <circle
                cx={x(tap.time)}
                cy={y(tap.amplitude)}
                r={sel ? 7 : 5}
                fill={sel ? "var(--fg)" : COLORS.discrete}
              />
            </g>
          );
        })}
      </g>
      {playhead !== null && (
        <line x1={x(playhead)} x2={x(playhead)} y1={PAD} y2={H - PAD} className="playhead" />
      )}
    </svg>
  );
}
