import { useState, type SetStateAction } from "react";
import { MAX_PATTERN_MS } from "@buzzzz/core";
import type { IViewport } from "./model";

interface IComposerView {
  viewport: IViewport;
  cursor: number;
}

export function useComposerView(key: string, durationMs: number) {
  const initial: IComposerView = {
    viewport: {
      startMs: 0,
      durationMs: Math.min(MAX_PATTERN_MS, Math.max(100, Math.round(durationMs))),
    },
    cursor: 0,
  };
  const [views, setViews] = useState(() => new Map([[key, initial]]));
  const view = views.get(key) ?? initial;
  if (!views.has(key)) setViews(new Map(views).set(key, view));
  const setViewport = (value: SetStateAction<IViewport>) =>
    setViews((items) => {
      const current = items.get(key) ?? initial;
      const viewport = typeof value === "function" ? value(current.viewport) : value;
      return new Map(items).set(key, { ...current, viewport });
    });
  const setCursor = (cursor: number) =>
    setViews((items) => {
      const current = items.get(key) ?? initial;
      return new Map(items).set(key, { ...current, cursor: Math.max(0, cursor) });
    });
  return { ...view, setViewport, setCursor };
}
