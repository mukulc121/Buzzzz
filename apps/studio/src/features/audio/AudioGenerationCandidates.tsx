import { useEffect, useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { STRATEGIES } from "./generation/strategies";
import type { IGeneratedApproach } from "./generation/useAudioGeneration";
import { isEdited } from "./selection";
import { SoundDialog } from "./SoundDialog";
import { SoundParameter } from "./SoundParameter";
import { SoundInfo, SoundSection } from "./SoundSection";
import type { useAudioTrack } from "./useAudioTrack";

interface IAudioGenerationCandidates {
  generation: ReturnType<typeof useAudioTrack>["generation"];
  results: IGeneratedApproach[];
  currentPattern: Pattern;
  presetName: string;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve: (pattern: Pattern, name: string) => void;
}

const isEmpty = (result: IGeneratedApproach) =>
  result.pattern.continuousPattern.amplitude.length === 0 &&
  result.pattern.discretePattern.length === 0;

function approachMeta(result: IGeneratedApproach) {
  const parts = [`${result.pointCount} points`];
  if (result.eventCount > 0) parts.push(`${result.eventCount} events`);
  parts.push(`${result.elapsedMs}ms`);
  return parts.join(" · ");
}

export function AudioGenerationCandidates(props: IAudioGenerationCandidates) {
  const { generation, results, currentPattern, presetName, onApply, onRestore, onPreserve } = props;
  const { selectedId, applied, strategyParams } = generation;
  const [pending, setPending] = useState<{ strategyId: string | null } | null>(null);
  const edited = isEdited(currentPattern, applied);
  const selectedName = results.find((result) => result.strategyId === selectedId)?.name;
  useEffect(() => {
    generation.bind({ read: () => currentPattern, apply: onApply });
    return () => generation.bind(null);
  });
  const select = (strategyId: string | null) => {
    if (strategyId === null) {
      onRestore();
      generation.select(null, null);
      return;
    }
    const result = results.find((item) => item.strategyId === strategyId);
    if (!result) return;
    onApply(result.pattern, result.name);
    generation.select(strategyId, result.pattern);
  };
  const choose = (strategyId: string | null) =>
    edited ? setPending({ strategyId }) : select(strategyId);
  return (
    <SoundSection title="Approaches">
      <ul className="sound-candidates audio-candidates" aria-label="Approaches">
        {results.map((result) => {
          const active = selectedId === result.strategyId;
          const failed = Boolean(result.error);
          const empty = !failed && isEmpty(result);
          const params = active
            ? (STRATEGIES.find((strategy) => strategy.id === result.strategyId)?.params ?? [])
            : [];
          return (
            <li className="sound-candidate-row" key={result.strategyId}>
              <button
                type="button"
                className={`audio-candidate sound-candidate${failed ? " sound-candidate-failed" : ""}`}
                aria-pressed={active}
                disabled={failed || empty}
                onClick={() => choose(result.strategyId)}
              >
                <span className="sound-candidate-name">{result.name}</span>
                <span className="sound-candidate-summary">
                  {failed ? result.error : empty ? "Found nothing in this audio." : result.summary}
                </span>
                {!failed && !empty && (
                  <span className="sound-candidate-meta">{approachMeta(result)}</span>
                )}
              </button>
              <span className="sound-candidate-info">
                <SoundInfo description={result.detail} />
              </span>
              {params.length > 0 && (
                <div className="sound-candidate-params">
                  {params.map((param) => (
                    <SoundParameter
                      key={param.id}
                      label={param.label}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      unit={param.suffix}
                      value={strategyParams[result.strategyId]?.[param.id] ?? param.defaultValue}
                      onChange={(value) =>
                        generation.setStrategyParam(result.strategyId, param.id, value)
                      }
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {edited && selectedId && (
        <p className="sound-metric-hint">
          You have edited <strong>{selectedName}</strong>. Switching approach will ask what to do
          with those changes.
        </p>
      )}
      <button
        type="button"
        className="sound-text-action"
        disabled={selectedId === null}
        onClick={() => choose(null)}
      >
        Restore my pattern
      </button>
      {pending && (
        <SoundDialog title="You have unsaved changes" onClose={() => setPending(null)}>
          <p>
            You have edited <strong>{selectedName ?? "this approach"}</strong>.{" "}
            {pending.strategyId ? (
              <>
                Switching to{" "}
                <strong>
                  {results.find((result) => result.strategyId === pending.strategyId)?.name}
                </strong>{" "}
                replaces the whole pattern.
              </>
            ) : (
              "Restoring your own pattern replaces the whole pattern."
            )}
          </p>
          <p>Keep the edits in a copy of this pattern, or discard them?</p>
          <div className="sound-confirm-actions">
            <button type="button" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null);
                select(pending.strategyId);
              }}
            >
              Discard
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                onPreserve(currentPattern, `${presetName} copy`);
                setPending(null);
                select(pending.strategyId);
              }}
            >
              Keep a copy
            </button>
          </div>
        </SoundDialog>
      )}
    </SoundSection>
  );
}
