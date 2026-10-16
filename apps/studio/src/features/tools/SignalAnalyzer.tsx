import type { Pattern } from "@buzzzz/core";
import { patternStats } from "./signalStats";

interface ISignalAnalyzer {
  pattern: Pattern;
}
export function SignalAnalyzer(props: ISignalAnalyzer) {
  const stats = patternStats(props.pattern);
  return (
    <div className="panel-content">
      <p>Statistics for the active haptic pattern. Audio analysis is available in Sound.</p>
      <dl>
        <dt>Duration</dt>
        <dd>{(stats.durationMs / 1000).toFixed(3)}s</dd>
        <dt>Envelope points</dt>
        <dd>{stats.envelopePoints}</dd>
        <dt>Taps</dt>
        <dd>{stats.taps}</dd>
        <dt>Peak intensity</dt>
        <dd>{stats.peak.toFixed(3)}</dd>
        <dt>Mean envelope intensity</dt>
        <dd>{stats.average.toFixed(3)}</dd>
        <dt>Envelope duty cycle</dt>
        <dd>{(stats.dutyCycle * 100).toFixed(1)}% above 0.01 intensity</dd>
        <dt>Mean frequency</dt>
        <dd>{stats.meanFrequency?.toFixed(3) ?? "No frequency data"} (normalized)</dd>
        <dt>Tightest same-layer gap</dt>
        <dd>
          {stats.tightestGapMs === null
            ? "At least two points required"
            : `${stats.tightestGapMs}ms`}
        </dd>
        <dt>Control updates per second</dt>
        <dd>{stats.eventsPerSecond.toFixed(1)}</dd>
        <dt>Intensity budget estimate</dt>
        <dd>
          <meter
            aria-label="Intensity budget estimate"
            min={0}
            max={1}
            value={stats.intensityBudget}
          />
          {` ${(stats.intensityBudget * 100).toFixed(1)}%`}
        </dd>
        <dt>Tap tempo estimate</dt>
        <dd>
          {stats.tempoBpm ? `${Math.round(stats.tempoBpm)}BPM` : "At least two taps required"}
        </dd>
      </dl>
      <p>
        Frequency in Hz depends on the phone. The budget measures mean squared intensity with
        estimated 10 ms taps; it is not a hardware limit. Leave quiet gaps between sustained
        effects.
      </p>
    </div>
  );
}
