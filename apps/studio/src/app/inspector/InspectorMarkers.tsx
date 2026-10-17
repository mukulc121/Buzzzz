import { MAX_PATTERN_MS, patternEnd } from "@buzzzz/core";
import type { Studio } from "../useStudio";
import { InspectorSection } from "../../components/InspectorSection";
import { InspectorIcon } from "../../components/InspectorIcon";
import { InspectorNumber } from "../../components/InspectorNumber";

interface IInspectorMarkers {
  studio: Studio;
}
export function InspectorMarkers(props: IInspectorMarkers) {
  const { document, composer, playback, audio, animation } = props.studio;
  const duration = Math.min(
    MAX_PATTERN_MS,
    Math.max(
      patternEnd(document.pattern),
      document.preset.editor?.durationMs ?? 0,
      audio.analysis?.durationMs ?? 0,
      animation.source?.durationMs ?? 0,
    ),
  );
  return (
    <InspectorSection
      title="Markers"
      description="Named instants in the pattern - where a hit lands, where a door closes. They are drawn on the chart and on every timeline, and dragging one on any of them moves it everywhere. Add one at the cursor with M, or right-click the canvas."
    >
      {composer.markers.length ? (
        <div className="inspector-marker-list">
          {composer.markers.map((marker) => (
            <div className="marker-row" key={marker.id}>
              <input
                aria-label="Marker label"
                value={marker.label}
                placeholder="Unnamed"
                maxLength={60}
                onFocus={document.begin}
                onChange={(event) => composer.renameMarker(marker.id, event.target.value)}
              />
              <InspectorNumber
                label="Marker time"
                value={Math.round(marker.time)}
                min={0}
                max={duration}
                step={10}
                unit="ms"
                onBegin={document.begin}
                onChange={(value) => {
                  if (Number.isFinite(value))
                    composer.moveMarker(
                      marker.id,
                      Math.max(0, Math.min(duration, Math.round(value))),
                    );
                }}
              />
              <button
                type="button"
                aria-label={`Delete ${marker.label}`}
                title={`Delete ${marker.label}`}
                onClick={() => {
                  document.begin();
                  composer.setMarkers((items) => items.filter((item) => item.id !== marker.id));
                }}
              >
                <InspectorIcon name="trash" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">
          No markers yet. They annotate the timeline - they don't change what plays.
        </p>
      )}
      <button
        className="inspector-text-action"
        type="button"
        onClick={() => {
          document.begin();
          composer.addMarker(playback.playhead ?? 0);
        }}
      >
        <InspectorIcon name="marker" />
        Add marker at the cursor
      </button>
    </InspectorSection>
  );
}
