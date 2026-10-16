import type { ReactNode } from "react";
import type { Pattern } from "@buzzzz/core";
import type { IAudioAnalysis } from "../audio/model";
import type { IAnimationAnalysis } from "../animation/model";
import { curvePoints, fractionOf, normalize } from "./timelineGeometry";

export type TimelineLaneId = "pattern" | "audio" | "motion";

interface ITimelineLanes {
  pattern: Pattern;
  audio: IAudioAnalysis | null;
  animation: IAnimationAnalysis | null;
  end: number;
  lanes: readonly TimelineLaneId[];
}

interface ILane {
  id: TimelineLaneId;
  label: string;
  children: ReactNode;
}

interface ILaneData<T> {
  data: T;
  end: number;
}

const HEIGHT = 48;
const x = (time: number, end: number) => fractionOf(time, end) * 1000;

function Lane(props: ILane) {
  const { id, label, children } = props;
  return (
    <div className={`timeline-lane timeline-lane-${id}`} data-lane={id}>
      <span className="timeline-lane-label">{label}</span>
      <svg viewBox={`0 0 1000 ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={label}>
        {children}
      </svg>
    </div>
  );
}

function PatternLane(props: ILaneData<Pattern>) {
  const { data: pattern, end } = props;
  const amplitude = curvePoints(pattern.continuousPattern.amplitude, end, HEIGHT - 4);
  const frequency = curvePoints(pattern.continuousPattern.frequency, end, HEIGHT - 4);
  const points = pattern.continuousPattern.amplitude;
  const [first, last] = [points[0]?.time ?? 0, points.at(-1)?.time ?? 0].map((time) =>
    x(time, end),
  );
  return (
    <Lane id="pattern" label="Pattern overview">
      {amplitude && (
        <polygon
          points={`${first},${HEIGHT - 4} ${amplitude} ${last},${HEIGHT - 4}`}
          className="timeline-amp-fill"
        />
      )}
      <polyline points={amplitude} className="timeline-amp" />
      <polyline points={frequency} className="timeline-freq" />
      {pattern.discretePattern.map((tap, index) => (
        <line
          key={index}
          x1={x(tap.time, end)}
          x2={x(tap.time, end)}
          y1={HEIGHT - 4 - tap.amplitude * (HEIGHT - 8)}
          y2={HEIGHT - 4}
          className="timeline-tap"
        />
      ))}
    </Lane>
  );
}

function AudioLane(props: ILaneData<IAudioAnalysis>) {
  const { data: audio, end } = props;
  const half = HEIGHT / 2;
  const levels = normalize(
    audio.frames,
    (frame) => frame.rms,
    (frame) => frame.timeMs,
  );
  const top = levels.map((point) => `${x(point.time, end)},${half - point.value * (half - 2)}`);
  const bottom = levels
    .map((point) => `${x(point.time, end)},${half + point.value * (half - 2)}`)
    .reverse();
  return (
    <Lane id="audio" label="Audio waveform">
      <polygon points={[...top, ...bottom].join(" ")} className="timeline-wave" />
      {audio.onsets.map((onset, index) => (
        <line
          key={index}
          x1={x(onset.timeMs, end)}
          x2={x(onset.timeMs, end)}
          y1={0}
          y2={4}
          className="timeline-onset"
        />
      ))}
    </Lane>
  );
}

function MotionLane(props: ILaneData<IAnimationAnalysis>) {
  const { data: animation, end } = props;
  const energy = normalize(
    animation.frames,
    (frame) => frame.energy,
    (frame) => frame.timeMs,
  );
  return (
    <Lane id="motion" label="Motion energy">
      <polyline points={curvePoints(energy, end, HEIGHT - 4)} className="timeline-motion" />
      {animation.impacts.map((impact, index) => (
        <line
          key={index}
          x1={x(impact.timeMs, end)}
          x2={x(impact.timeMs, end)}
          y1={0}
          y2={HEIGHT - 4}
          className="timeline-impact"
        />
      ))}
    </Lane>
  );
}

export function TimelineLanes(props: ITimelineLanes) {
  const { pattern, audio, animation, end, lanes } = props;
  return (
    <>
      {lanes.includes("pattern") && <PatternLane data={pattern} end={end} />}
      {audio && lanes.includes("audio") && <AudioLane data={audio} end={end} />}
      {animation && lanes.includes("motion") && <MotionLane data={animation} end={end} />}
    </>
  );
}
