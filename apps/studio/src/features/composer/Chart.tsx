import { useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { isPattern } from "@buzzzz/core";
import { LAYERS, selectionKey, type IChart } from "./model";
import { useChartInteraction } from "./useChartInteraction";
import { snapTime } from "./viewport";

import { chartGeometry } from "./geometry";
import { ChartAxes } from "./ChartAxes";
import { ChartOverlays } from "./ChartOverlays";
import { EnvelopeLayer } from "./EnvelopeLayer";
import { TapLayer } from "./TapLayer";
import { PlaybackCursor } from "./PlaybackCursor";
import { ChartCrosshair } from "./ChartCrosshair";
import { DEFAULT_EDITOR_SETTINGS, quantizeValue } from "./editorSettings";

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
    editorSettings = DEFAULT_EDITOR_SETTINGS,
  } = props;
  const svg = useRef<SVGSVGElement>(null);
  const clipId = useId();
  const [{ width, height }, setSize] = useState({ width: 800, height: 320 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const interaction = useChartInteraction({ props, svg, width, height });
  const selectedKeys = new Set(props.readOnly ? [] : interaction.selection.map(selectionKey));

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: Math.max(240, entry.contentRect.height) }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const geometry = chartGeometry({ width, height, startMs: viewStartMs, durationMs: viewMs });
  const add = (event: MouseEvent<SVGSVGElement>) => {
    if (
      props.readOnly ||
      !visibleLayers.includes(layer) ||
      (event.target instanceof Element && event.target.closest(".handle"))
    )
      return;
    const bounds = svg.current?.getBoundingClientRect();
    if (!bounds || !geometry.containsPlot(event.clientX - bounds.left, event.clientY - bounds.top))
      return;
    const point = interaction.position(event);
    if (!point) return;
    const next = structuredClone(pattern);
    const time = snapTime(point.time, snapMs);
    let index: number;
    if (layer === "discrete") {
      index = next.discretePattern.length;
      next.discretePattern.push({
        time,
        amplitude: quantizeValue(point.value, editorSettings.valueDecimals),
        frequency: 0.5,
      });
    } else {
      index = next.continuousPattern[layer].length;
      next.continuousPattern[layer].push({
        time,
        value: quantizeValue(point.value, editorSettings.valueDecimals),
      });
    }
    if (!isPattern(next)) {
      props.onError?.("This edit exceeds the pattern point limit.");
      return;
    }
    onBegin();
    onChange(next);
    interaction.select([{ layer, index }]);
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    interaction.move(event);
    const bounds = svg.current?.getBoundingClientRect();
    if (
      !editorSettings.crosshair ||
      !bounds ||
      event.pointerType === "touch" ||
      !geometry.containsPlot(event.clientX - bounds.left, event.clientY - bounds.top)
    ) {
      setHover(null);
      return;
    }
    setHover({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };

  return (
    <svg
      ref={svg}
      className="chart"
      data-readonly={props.readOnly || undefined}
      viewBox={`0 0 ${width} ${height}`}
      style={{ touchAction: "none" }}
      tabIndex={0}
      onDoubleClick={add}
      onPointerDown={interaction.backgroundDown}
      onPointerMove={move}
      onPointerLeave={() => setHover(null)}
      onPointerUp={interaction.reset}
      onPointerCancel={interaction.reset}
      onLostPointerCapture={interaction.reset}
      onKeyDown={(event) => interaction.keyDown(event)}
      role="group"
      aria-label="Haptic pattern timeline"
      aria-description={
        props.readOnly
          ? "Source Rive haptic timeline. Editing is disabled. Scroll to pan; Cmd/Ctrl+wheel zooms at the pointer; middle-drag pans."
          : "Double-click to add a point. Shift-click or drag a rectangle to select points. Arrow keys move selected points. Scroll to pan; Cmd/Ctrl+wheel zooms at the pointer; middle-drag pans."
      }
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={geometry.left}
            y={geometry.top}
            width={geometry.plotWidth}
            height={geometry.plotHeight}
          />
        </clipPath>
      </defs>
      <rect
        x={geometry.left}
        y={geometry.top}
        width={geometry.plotWidth}
        height={geometry.plotHeight}
        fill="var(--plot)"
        rx={4}
      />
      <ChartAxes geometry={geometry} density={editorSettings.gridDensity} />
      {editorSettings.timeCursor && (
        <PlaybackCursor
          time={playhead}
          geometry={geometry}
          snapMs={snapMs}
          onScrub={props.readOnly ? undefined : onScrub}
          getTime={props.getPlayhead}
        />
      )}
      <g clipPath={`url(#${clipId})`}>
        <ChartOverlays geometry={geometry} range={playbackRange} curves={props.analysisCurves} />
        {(props.patternSegments ?? [pattern]).map((segment, index) => {
          const continuousEnd = Math.max(
            0,
            ...segment.continuousPattern.amplitude.map((point) => point.time),
            ...segment.continuousPattern.frequency.map((point) => point.time),
          );
          return (
            <g key={index} data-pattern-segment={index}>
              {visibleLayers.includes("amplitude") && (
                <EnvelopeLayer
                  layer="amplitude"
                  points={segment.continuousPattern.amplitude}
                  geometry={geometry}
                  selectedKeys={selectedKeys}
                  interaction={interaction}
                  valueDecimals={editorSettings.valueDecimals}
                  endMs={continuousEnd}
                  readOnly={props.readOnly}
                />
              )}
              {visibleLayers.includes("frequency") && (
                <EnvelopeLayer
                  layer="frequency"
                  points={segment.continuousPattern.frequency}
                  geometry={geometry}
                  selectedKeys={selectedKeys}
                  interaction={interaction}
                  valueDecimals={editorSettings.valueDecimals}
                  endMs={continuousEnd}
                  readOnly={props.readOnly}
                />
              )}
            </g>
          );
        })}
        {visibleLayers.includes("discrete") && (
          <TapLayer
            points={pattern.discretePattern}
            geometry={geometry}
            selectedKeys={selectedKeys}
            interaction={interaction}
            valueDecimals={editorSettings.valueDecimals}
            readOnly={props.readOnly}
          />
        )}
        <ChartOverlays geometry={geometry} rectangle={interaction.rectangle} />
      </g>
      <ChartOverlays
        geometry={geometry}
        markers={markers}
        markerDurationMs={props.markerDurationMs}
        onMarkerMove={props.onMarkerMove}
        onMarkerRename={props.onMarkerRename}
        onBegin={onBegin}
      />
      {editorSettings.crosshair && (
        <ChartCrosshair
          position={hover}
          geometry={geometry}
          valueDecimals={editorSettings.valueDecimals}
        />
      )}
    </svg>
  );
}
