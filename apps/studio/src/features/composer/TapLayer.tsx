import type { Pattern } from "@buzzzz/core";
import { COLORS, selectionKey, type PointSelection } from "./model";
import type { IChartGeometry } from "./geometry";
import type { useChartInteraction } from "./useChartInteraction";

interface ITapLayer {
  points: Pattern["discretePattern"];
  geometry: IChartGeometry;
  selectedKeys: ReadonlySet<string>;
  interaction: ReturnType<typeof useChartInteraction>;
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
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            className="handle"
            aria-label={`Tap at ${Math.round(tap.time)} milliseconds, ${Math.round(tap.amplitude * 100)} percent intensity`}
            onFocus={() => interaction.focusPoint(selection)}
            onKeyDown={(event) => interaction.keyDown(event, selection)}
            onPointerDown={interaction.grab(selection, tap.time, tap.amplitude)}
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
              r={selected ? 7 : 5}
              fill={selected ? "var(--fg)" : COLORS.discrete}
            />
          </g>
        );
      })}
    </g>
  );
}
