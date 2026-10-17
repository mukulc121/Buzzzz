import { useState } from "react";
import { patternEnd, type Pattern } from "@buzzzz/core";
import { randomUUID } from "../../crypto";
import type { IPlaybackRange, IViewport, PointSelection } from "../composer/model";
import {
  captureSnippetRange,
  initialSnippetRange,
  normalizeSnippet,
} from "../composer/snippetRangeModel";
import { loadSnippets, saveSnippets } from "./snippetsStore";

interface ISnippetCapture {
  instanceKey: string;
  pattern: Pattern;
  name: string;
  selection: readonly PointSelection[];
  viewport: IViewport;
  durationMs: number;
  valueDecimals: number;
  canEdit: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
}

export function useSnippetCapture(options: ISnippetCapture) {
  const [framing, setFraming] = useState<{ instanceKey: string; range: IPlaybackRange } | null>(
    null,
  );
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const range =
    framing?.instanceKey === options.instanceKey && options.canEdit ? framing.range : null;
  const cancel = () => {
    setFraming(null);
    return range !== null;
  };
  const open = () => {
    if (!options.canEdit) return;
    setFraming({ instanceKey: options.instanceKey, range: initialSnippetRange(options) });
  };
  const create = (name: string, pattern: Pattern, durationMs: number) => {
    if (!options.canEdit) return;
    try {
      const id = randomUUID();
      saveSnippets([{ id, name: name.slice(0, 80), pattern, durationMs }, ...loadSnippets()]);
      setPendingRenameId(id);
      options.onSaved();
    } catch (error) {
      options.onError(error instanceof Error ? error.message : "Could not save the snippet.");
    }
  };
  return {
    range,
    pendingRenameId,
    clearPendingRename: () => setPendingRenameId(null),
    open,
    cancel,
    toggle: () => (range ? cancel() : open()),
    change: (value: IPlaybackRange) => {
      if (!range) return;
      setFraming({ instanceKey: options.instanceKey, range: value });
    },
    save: () => {
      if (!range) return;
      const pattern = captureSnippetRange(options.pattern, range, options.valueDecimals);
      cancel();
      if (pattern) create(`${options.name} part`, pattern, patternEnd(pattern));
    },
    savePattern: () => {
      const pattern = normalizeSnippet(options.pattern);
      create(options.name, pattern, patternEnd(pattern));
    },
  };
}
