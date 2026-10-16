import { useCallback, useEffect, useState, type RefObject } from "react";
import type { IViewport } from "./model";
import { fitTimelineView, zoomTimelineView } from "./timelineScaleGeometry";

export function useTimelineScale(
  target: RefObject<HTMLElement | null>,
  extent: number,
  collapsed: boolean,
  instanceKey = "",
) {
  const [windows, setWindows] = useState(() => new Map<string, IViewport>());
  const view = fitTimelineView(windows.get(instanceKey) ?? null, extent);
  const setWindow = useCallback(
    (update: (current: IViewport | null) => IViewport) =>
      setWindows((current) =>
        new Map(current).set(instanceKey, update(current.get(instanceKey) ?? null)),
      ),
    [instanceKey],
  );
  const pan = (startMs: number) =>
    setWindow((current) =>
      fitTimelineView({ ...fitTimelineView(current, extent), startMs }, extent),
    );
  const zoom = (factor: number, anchor = 0.5) =>
    setWindow((current) =>
      zoomTimelineView(fitTimelineView(current, extent), extent, factor, anchor),
    );
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const anchor = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const factor = event.deltaY < 0 ? 1 / 1.15 : 1.15;
        setWindow((current) =>
          zoomTimelineView(fitTimelineView(current, extent), extent, factor, anchor),
        );
      } else
        setWindow((current) => {
          const previous = fitTimelineView(current, extent);
          return fitTimelineView(
            {
              ...previous,
              startMs:
                previous.startMs +
                ((event.deltaX || event.deltaY) * previous.durationMs) / rect.width,
            },
            extent,
          );
        });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [target, extent, collapsed, setWindow]);
  return { view, zoom, pan };
}
