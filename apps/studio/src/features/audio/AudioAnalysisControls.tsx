import { Fragment } from "react";
import { scaleCaption } from "./metrics/display";
import type { ValueAxis } from "./metrics/display";
import { AUDIO_METRICS, MAX_FRAME_MS, MIN_FRAME_MS } from "./metrics";
import type { IMetric } from "./metrics/model";
import { SoundParameter } from "./SoundParameter";
import { SoundInfo, SoundSection } from "./SoundSection";
import { SoundSwitch } from "./SoundSwitch";
import type { useAudioTrack } from "./useAudioTrack";

type Analysis = ReturnType<typeof useAudioTrack>["metrics"];

interface IAudioAnalysisControls {
  analysis: Analysis;
  loading: boolean;
}
interface IMetricControl {
  analysis: Analysis;
  metric: IMetric;
}

const VALUE_AXES: { value: ValueAxis; label: string }[] = [
  { value: "clip", label: "Fit to clip" },
  { value: "full", label: "True value" },
];

function MetricControl(props: IMetricControl) {
  const { analysis, metric } = props;
  const enabled = analysis.enabled[metric.id] ?? false;
  const caption = analysis.valueAxis === "full" ? scaleCaption(metric) : null;
  return (
    <li className="sound-metric-row">
      <div className="sound-metric-head">
        <span
          className="sound-metric-swatch"
          style={{ background: metric.color }}
          aria-hidden="true"
        />
        <SoundSwitch
          label={metric.label}
          description={metric.description}
          checked={enabled}
          onChange={(checked) => analysis.setMetricEnabled(metric.id, checked)}
        />
      </div>
      {enabled && caption && <p className="sound-metric-scale">{caption}</p>}
      {enabled && metric.params && metric.params.length > 0 && (
        <div className="sound-metric-params">
          {metric.params.map((param) => (
            <SoundParameter
              key={param.id}
              label={param.label}
              min={param.min}
              max={param.max}
              step={param.step}
              unit={param.suffix}
              value={analysis.params[metric.id]?.[param.id] ?? param.defaultValue}
              onChange={(value) => analysis.setMetricParam(metric.id, param.id, value)}
            />
          ))}
        </div>
      )}
    </li>
  );
}

export function AudioAnalysisControls(props: IAudioAnalysisControls) {
  const { analysis, loading } = props;
  return (
    <SoundSection
      title="Signal analysis"
      description="Measure the attached audio and draw it over the chart as a reference. By default each line is a normalized shape rather than a reading - the value axis stays the haptic 0-100% - but you can switch it to each metric’s own full scale below."
    >
      <SoundParameter
        label="Analysis frame"
        description="The window each measurement is taken over - shorter frames catch transients, longer ones smooth them. Shared by every metric below."
        min={MIN_FRAME_MS}
        max={MAX_FRAME_MS}
        step={1}
        unit="ms"
        value={analysis.frameMs}
        onChange={analysis.setFrameMs}
      />
      <div className="sound-display-controls">
        <div className="sound-value-axis">
          <span>
            Value axis{" "}
            <SoundInfo description="What the top of the chart means. Fit to clip normalizes each line to its own loudest moment in this file, so it fills the height - read the shape, not the number. True value draws each line against its own full scale - 4 acum, 8 asper, 24 dB - so the height is a reading you can compare between files." />
          </span>
          <div className="sound-segmented" role="group" aria-label="Value axis">
            {VALUE_AXES.map((axis) => (
              <button
                key={axis.value}
                type="button"
                aria-pressed={analysis.valueAxis === axis.value}
                onClick={() => analysis.setValueAxis(axis.value)}
              >
                {axis.label}
              </button>
            ))}
          </div>
        </div>
        <SoundSwitch
          label="dB curve"
          description="Map the raw level metrics - Envelope follower, Band energy, Spectral flux - onto a perceptual dB scale over 60 dB. Vibrotactile loudness already carries its own dB mapping, with a Floor knob, and the rest are ratios or frequencies that a dB curve would only distort."
          checked={analysis.dbCurve}
          onChange={analysis.setDbCurve}
        />
      </div>
      <ul className="sound-metric-list">
        {AUDIO_METRICS.map((metric, index) => (
          <Fragment key={metric.id}>
            {metric.group !== AUDIO_METRICS[index - 1]?.group && (
              <li className="sound-metric-group" aria-hidden="true">
                {metric.group}
              </li>
            )}
            <MetricControl analysis={analysis} metric={metric} />
          </Fragment>
        ))}
      </ul>
      {loading && <p className="hint">Decoding audio…</p>}
    </SoundSection>
  );
}
