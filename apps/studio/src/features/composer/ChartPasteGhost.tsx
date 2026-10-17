import type { IChartGeometry } from "./geometry";
import { COLORS } from "./model";
import { pasteLayers, type IChartClipboard, type TPasteMode } from "./pasteModel";

interface IChartPasteGhost {
  geometry: IChartGeometry;
  clipboard: IChartClipboard;
  start: number;
  mode: TPasteMode;
}

export function ChartPasteGhost(props: IChartPasteGhost) {
  const { geometry, clipboard, start, mode } = props;
  const layers = pasteLayers(mode);
  const left = geometry.x(start);
  const right = geometry.x(start + clipboard.width);
  return (
    <g data-paste-preview aria-hidden="true" pointerEvents="none">
      <rect
        x={Math.min(left, right)}
        y={geometry.top}
        width={Math.max(2, Math.abs(right - left))}
        height={geometry.plotHeight}
        fill="var(--primary-bg)"
        opacity={0.3}
        stroke="var(--fg)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />
      {(["frequency", "amplitude"] satisfies ("frequency" | "amplitude")[])
        .filter((layer) => layers.includes(layer))
        .map((layer) => {
          const points = [...clipboard.pattern.continuousPattern[layer]].sort(
            (a, b) => a.time - b.time,
          );
          return (
            <g key={layer}>
              {points.length > 1 && (
                <polyline
                  points={points
                    .map((point) => `${geometry.x(start + point.time)},${geometry.y(point.value)}`)
                    .join(" ")}
                  fill="none"
                  stroke={COLORS[layer]}
                  strokeWidth={2.5}
                  strokeDasharray={layer === "frequency" ? "7 4" : undefined}
                />
              )}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={geometry.x(start + point.time)}
                  cy={geometry.y(point.value)}
                  r={5}
                  fill="var(--panel)"
                  stroke={COLORS[layer]}
                  strokeWidth={2}
                />
              ))}
            </g>
          );
        })}
      {layers.includes("discrete") &&
        clipboard.pattern.discretePattern.map((point, index) => (
          <g key={index} transform={`translate(${geometry.x(start + point.time)},0)`}>
            <rect
              x={-11}
              y={geometry.y(point.amplitude)}
              width={7}
              height={geometry.bottom - geometry.y(point.amplitude)}
              fill={COLORS.discrete}
              rx={2}
            />
            <rect
              x={4}
              y={geometry.y(point.frequency)}
              width={7}
              height={geometry.bottom - geometry.y(point.frequency)}
              fill={COLORS.frequency}
              rx={2}
            />
          </g>
        ))}
    </g>
  );
}
