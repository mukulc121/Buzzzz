import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { isPattern } from "@buzzzz/core";
import { LAYERS, selectionKey, type IChart } from "./model";
import { useChartInteraction } from "./useChartInteraction";
import { snapTime } from "./viewport";

import { CHART_PADDING as PAD, type IChartGeometry } from "./geometry";
import { ChartAxes } from "./ChartAxes";
import { ChartOverlays } from "./ChartOverlays";
import { EnvelopeLayer } from "./EnvelopeLayer";
import { TapLayer } from "./TapLayer";
import { PlaybackCursor } from "./PlaybackCursor";

export function Chart(props: IChart) {
  const {
    pattern,
    layer,
    viewMs,
    playhead,
    onBegin,
    onChange,
    onScrub,
    snapMs = 0,
    viewStartMs = 0,
    visibleLayers = LAYERS,
    playbackRange,
    markers = [],
  } = props;
  const svg = useRef<SVGSVGElement>(null);
  const clipId = useId();
  const [{ width, height }, setSize] = useState({ width: 800, height: 320 });
  const interaction = useChartInteraction({ props, svg, width, height });
  const selectedKeys = new Set(interaction.selection.map(selectionKey));

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: Math.max(240, entry.contentRect.height) }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const x = (time: number) => PAD + ((time - viewStartMs) / viewMs) * Math.max(1, width - 2 * PAD);
  const y = (value: number) => PAD + (1 - value) * (height - 2 * PAD);
  const inView = (time: number) => time >= viewStartMs && time <= viewStartMs + viewMs;
  const geometry: IChartGeometry = {
    width,
    height,
    startMs: viewStartMs,
    durationMs: viewMs,
    x,
    y,
    inView,
  };
  const add = (event: MouseEvent<SVGSVGElement>) => {
    if (
      !visibleLayers.includes(layer) ||
      (event.target instanceof Element && event.target.closest(".handle"))
    )
      return;
    const bounds = svg.current?.getBoundingClientRect();
    if (!bounds || event.clientY - bounds.top < PAD || event.clientY - bounds.top > height - PAD)
      return;
    const point = interaction.position(event);
    if (!point) return;
    const next = structuredClone(pattern);
    const time = snapTime(point.time, snapMs);
    let index: number;
    if (layer === "discrete") {
      index = next.discretePattern.length;
      next.discretePattern.push({ time, amplitude: point.value, frequency: 0.5 });
    } else {
      index = next.continuousPattern[layer].length;
      next.continuousPattern[layer].push({ time, value: point.value });
    }
    if (!isPattern(next)) {
      props.onError?.("This edit exceeds the pattern point limit.");
      return;
    }
    onBegin();
    onChange(next);
    interaction.select([{ layer, index }]);
  };

  return (
    <svg
      ref={svg}
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      style={{ touchAction: "none" }}
      tabIndex={0}
      onDoubleClick={add}
      onPointerDown={interaction.backgroundDown}
      onPointerMove={interaction.move}
      onPointerUp={interaction.reset}
      onPointerCancel={interaction.reset}
      onLostPointerCapture={interaction.reset}
      onKeyDown={(event) => interaction.keyDown(event)}
      role="group"
      aria-label="Haptic pattern timeline"
      aria-description="Double-click to add a point. Shift-click or drag a rectangle to select points. Arrow keys move selected points. Alt-drag pans; the mouse wheel zooms."
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={PAD - 8}
            y={PAD - 8}
            width={Math.max(1, width - 2 * PAD + 16)}
            height={height - 2 * PAD + 16}
          />
        </clipPath>
      </defs>
      <ChartAxes geometry={geometry} />
      <g clipPath={`url(#${clipId})`}>
        <ChartOverlays
          geometry={geometry}
          range={playbackRange}
          markers={markers}
          curves={props.analysisCurves}
        />
        <PlaybackCursor time={playhead} geometry={geometry} snapMs={snapMs} onScrub={onScrub} />
        {visibleLayers.includes("amplitude") && (
          <EnvelopeLayer
            layer="amplitude"
            points={pattern.continuousPattern.amplitude}
            geometry={geometry}
            selectedKeys={selectedKeys}
            interaction={interaction}
          />
        )}
        {visibleLayers.includes("frequency") && (
          <EnvelopeLayer
            layer="frequency"
            points={pattern.continuousPattern.frequency}
            geometry={geometry}
            selectedKeys={selectedKeys}
            interaction={interaction}
          />
        )}
        {visibleLayers.includes("discrete") && (
          <TapLayer
            points={pattern.discretePattern}
            geometry={geometry}
            selectedKeys={selectedKeys}
            interaction={interaction}
          />
        )}
        <ChartOverlays geometry={geometry} rectangle={interaction.rectangle} />
      </g>
    </svg>
  );
}
