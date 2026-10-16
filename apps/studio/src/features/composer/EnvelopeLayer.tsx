import type { Pattern } from "@buzzzz/core";
import { COLORS, selectionKey, type Layer } from "./model";
import type { IChartGeometry } from "./geometry";
import type { useChartInteraction } from "./useChartInteraction";

interface IEnvelopeLayer {
  layer: Exclude<Layer, "discrete">;
  points: Pattern["continuousPattern"]["amplitude"];
  geometry: IChartGeometry;
  selectedKeys: ReadonlySet<string>;
  interaction: ReturnType<typeof useChartInteraction>;
  endMs?: number;
  valueDecimals?: number;
}

export function EnvelopeLayer(props: IEnvelopeLayer) {
  const { layer, geometry, selectedKeys, interaction } = props;
  const { x, y, inView } = geometry;
  const points = props.points
    .map((point, index) => ({ ...point, index }))
    .sort((a, b) => a.time - b.time);
  const last = points.at(-1);
  const linePoints =
    last && props.endMs !== undefined && props.endMs > last.time
      ? [...points, { time: props.endMs, value: last.value }]
      : points;
  return (
    <g>
      {points.length > 0 && (
        <path
          d={
            `M${x(points[0].time)},${y(0)} ` +
            linePoints.map((point) => `L${x(point.time)},${y(point.value)}`).join(" ") +
            ` L${x(linePoints.at(-1)!.time)},${y(0)} Z`
          }
          fill={layer === "amplitude" ? "var(--amp-area)" : "none"}
          fillOpacity={0.55}
          stroke="none"
          pointerEvents="none"
        />
      )}
      {points.length > 0 && (
        <polyline
          data-envelope={layer}
          points={linePoints.map((point) => `${x(point.time)},${y(point.value)}`).join(" ")}
          fill="none"
          stroke={COLORS[layer]}
          strokeWidth={2.5}
          strokeDasharray={layer === "frequency" ? "7 4" : undefined}
          pointerEvents="none"
        />
      )}
      {points
        .filter((point) => inView(point.time))
        .map((point) => {
          const selection = { layer, index: point.index };
          const selected = selectedKeys.has(selectionKey(selection));
          return (
            <circle
              key={point.index}
              className="handle envelope-point"
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${layer === "amplitude" ? "Intensity" : "Frequency"} point at ${Math.round(point.time)} milliseconds, ${Number((point.value * 100).toFixed(props.valueDecimals ?? 1))} percent`}
              onFocus={() => interaction.focusPoint(selection)}
              onKeyDown={(event) => interaction.keyDown(event, selection)}
              cx={x(point.time)}
              cy={y(point.value)}
              r={selected ? 7 : 5.5}
              fill={selected ? "var(--primary-bg)" : "var(--panel)"}
              stroke={selected ? "var(--fg)" : COLORS[layer]}
              onPointerDown={interaction.grab(selection, point.time)}
            />
          );
        })}
    </g>
  );
}
