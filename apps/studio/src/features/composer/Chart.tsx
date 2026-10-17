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
import { ChartContextMenu } from "./ChartContextMenu";
import { ChartPasteGhost } from "./ChartPasteGhost";
import { ChartPasteControls } from "./ChartPasteControls";

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
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    lockedAxis: "x" | "y" | null;
  } | null>(null);
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
      interaction.paste.preview ||
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
    const dragged = interaction.move(event);
    const bounds = svg.current?.getBoundingClientRect();
    if (
      !editorSettings.crosshair ||
      !bounds ||
      event.pointerType === "touch" ||
      (!dragged && !geometry.containsPlot(event.clientX - bounds.left, event.clientY - bounds.top))
    ) {
      setHover(null);
      return;
    }
    setHover(
      dragged ?? {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        lockedAxis: null,
      },
    );
  };

  return (
    <div className="chart-surface" onContextMenu={interaction.contextMenu}>
      <svg
        ref={svg}
        className="chart"
        data-readonly={props.readOnly || undefined}
        viewBox={`0 0 ${width} ${height}`}
        style={{ touchAction: "none" }}
        tabIndex={0}
        onDoubleClick={add}
        onPointerDownCapture={(event) => interaction.paste.down(event, geometry)}
        onPointerMoveCapture={(event) => interaction.paste.move(event, geometry)}
        onPointerUpCapture={(event) => {
          if (interaction.paste.preview) {
            event.stopPropagation();
            interaction.paste.resetDrag();
          }
        }}
        onPointerDown={interaction.backgroundDown}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
        onPointerUp={interaction.reset}
        onPointerCancel={() => {
          interaction.reset();
          interaction.paste.resetDrag();
        }}
        onLostPointerCapture={() => {
          interaction.reset();
          interaction.paste.resetDrag();
        }}
        onKeyDown={(event) => interaction.keyDown(event)}
        role="group"
        aria-label="Haptic pattern timeline"
        aria-description={
          props.readOnly
            ? "Source Rive haptic timeline. Editing is disabled. Scroll to pan; Cmd/Ctrl+wheel zooms at the pointer; middle-drag pans."
            : "Double-click to add a point. Click a point to select it; drag a rectangle to select several. Shift-drag locks a continuous point to one axis. Arrow keys move selected points. Scroll to pan; Cmd/Ctrl+wheel zooms at the pointer; middle-drag pans."
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
        <g
          clipPath={`url(#${clipId})`}
          pointerEvents={interaction.paste.preview ? "none" : undefined}
        >
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
        {interaction.paste.preview && interaction.paste.clipboard && (
          <g clipPath={`url(#${clipId})`}>
            <ChartPasteGhost
              geometry={geometry}
              clipboard={interaction.paste.clipboard}
              {...interaction.paste.preview}
            />
          </g>
        )}
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
      {interaction.paste.preview && interaction.paste.clipboard && (
        <ChartPasteControls
          geometry={geometry}
          clipboard={interaction.paste.clipboard}
          {...interaction.paste.preview}
          onModeChange={interaction.paste.setMode}
          onApply={interaction.paste.apply}
          onCancel={interaction.paste.cancel}
        />
      )}
      {props.overlay?.(geometry)}
      {interaction.context && (
        <ChartContextMenu
          context={interaction.context}
          chart={props}
          geometry={geometry}
          selection={interaction.selection}
          clipboard={Boolean(interaction.paste.clipboard)}
          onClose={interaction.closeMenu}
          select={interaction.select}
          commit={interaction.commit}
          copy={interaction.paste.copy}
          pasteAt={interaction.paste.openAt}
        />
      )}
    </div>
  );
}
