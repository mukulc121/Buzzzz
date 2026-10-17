import type { Pattern } from "@buzzzz/core";
import { COLORS, selectionKey, type PointSelection } from "./model";
import type { IChartGeometry } from "./geometry";
import type { useChartInteraction } from "./useChartInteraction";

interface ITapLayer {
  points: Pattern["discretePattern"];
  geometry: IChartGeometry;
  selectedKeys: ReadonlySet<string>;
  interaction: ReturnType<typeof useChartInteraction>;
  valueDecimals?: number;
  readOnly?: boolean;
}

export function TapLayer(props: ITapLayer) {
  const { points, geometry, selectedKeys, interaction } = props;
  const { x, y, inView } = geometry;
  return (
    <g>
      {points.map((tap, index) => {
        if (!inView(tap.time)) return null;
        const selection: PointSelection = { layer: "discrete", index };
        const selected = selectedKeys.has(selectionKey(selection));
        return (
          <g
            key={index}
            role={props.readOnly ? "img" : "button"}
            tabIndex={props.readOnly ? undefined : 0}
            aria-disabled={props.readOnly || undefined}
            aria-pressed={props.readOnly ? undefined : selected}
            className="handle tap-event"
            aria-label={`Tap at ${Math.round(tap.time)} milliseconds, ${Number((tap.amplitude * 100).toFixed(props.valueDecimals ?? 1))} percent intensity`}
            onFocus={() => interaction.focusPoint(selection)}
            onKeyDown={(event) => interaction.keyDown(event, selection)}
            onPointerDown={interaction.grab(selection, tap.time, "time")}
          >
            <rect
              className="tap-event-highlight"
              x={x(tap.time) - 14}
              y={geometry.top}
              width={28}
              height={geometry.plotHeight}
              rx={3}
            />
            <path
              className="tap-bar"
              d={`M${x(tap.time) - 11},${y(0)}V${y(tap.amplitude) + 2}q0,-2 2,-2h3q2,0 2,2V${y(0)}Z`}
              fill={COLORS.discrete}
            />
            <path
              className="tap-bar"
              d={`M${x(tap.time) + 4},${y(0)}V${y(tap.frequency) + 2}q0,-2 2,-2h3q2,0 2,2V${y(0)}Z`}
              fill={COLORS.frequency}
            />
            <circle
              cx={x(tap.time) + 7.5}
              cy={y(tap.frequency)}
              r={selected ? 6.5 : 5}
              fill="var(--panel)"
              stroke={COLORS.frequency}
              onPointerDown={interaction.grab(selection, tap.time, "frequency")}
            />
            <circle
              cx={x(tap.time) - 7.5}
              cy={y(tap.amplitude)}
              r={selected ? 6.5 : 5}
              fill="var(--panel)"
              stroke={COLORS.discrete}
              onPointerDown={interaction.grab(selection, tap.time, "amplitude")}
            />
          </g>
        );
      })}
    </g>
  );
}
