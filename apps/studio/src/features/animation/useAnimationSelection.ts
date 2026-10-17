import { useEffect, useEffectEvent, useState } from "react";
import type { Pattern } from "@buzzzz/core";
import type { IAnimationCandidate } from "./model";

interface IAnimationSelection {
  sourceKey: string | null;
  candidates: readonly IAnimationCandidate[];
  currentPattern: Pattern;
  onGenerated: (pattern: Pattern) => void;
}
interface ISelection {
  id: IAnimationCandidate["id"];
  pattern: Pattern;
  next?: Pattern;
}

const close = (left: number, right: number) => Math.abs(left - right) <= 1e-6;
function matches(left: Pattern, right: Pattern) {
  return (
    left.discretePattern.length === right.discretePattern.length &&
    left.discretePattern.every((tap, index) => {
      const other = right.discretePattern[index];
      return (
        close(tap.time, other.time) &&
        close(tap.amplitude, other.amplitude) &&
        close(tap.frequency, other.frequency)
      );
    }) &&
    (["amplitude", "frequency"] as const).every((kind) => {
      const points = left.continuousPattern[kind];
      const others = right.continuousPattern[kind];
      return (
        points.length === others.length &&
        points.every(
          (point, index) =>
            close(point.time, others[index].time) && close(point.value, others[index].value),
        )
      );
    })
  );
}

export function useAnimationSelection(props: IAnimationSelection) {
  const { sourceKey, candidates, currentPattern, onGenerated } = props;
  const applyGenerated = useEffectEvent((key: string, pattern: Pattern) => {
    if (key === sourceKey) onGenerated(pattern);
  });
  const [stored, setStored] = useState(() => new Map<string, ISelection>());
  const selection = sourceKey ? (stored.get(sourceKey) ?? null) : null;
  const select = (selection: ISelection | null) => {
    if (!sourceKey) return;
    setStored((current) => {
      const next = new Map(current);
      if (selection) next.set(sourceKey, selection);
      else next.delete(sourceKey);
      return next;
    });
  };
  const selected = candidates.find((candidate) => candidate.id === selection?.id);
  const edited = selection !== null && !matches(currentPattern, selection.pattern);
  if (selection?.next && matches(currentPattern, selection.next)) {
    select({ id: selection.id, pattern: selection.next });
  } else if (
    selection &&
    selected &&
    !edited &&
    !matches(selection.next ?? selection.pattern, selected.pattern)
  ) {
    select({ ...selection, next: selected.pattern });
  }
  useEffect(() => {
    if (sourceKey && selection?.next && !edited) applyGenerated(sourceKey, selection.next);
  }, [edited, selection, sourceKey]);
  return {
    selectedId: selection?.id ?? null,
    edited,
    select,
  };
}
