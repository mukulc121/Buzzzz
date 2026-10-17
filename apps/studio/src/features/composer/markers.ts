import type { ITimelineMarker } from "./model";

export function nextMarkerLabel(markers: readonly ITimelineMarker[]) {
  const largest = markers.reduce(
    (max, marker) => Math.max(max, Number(/^Marker (\d+)$/.exec(marker.label)?.[1] ?? 0)),
    0,
  );
  return `Marker ${largest + 1}`;
}
