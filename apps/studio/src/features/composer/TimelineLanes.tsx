import type { ReactNode } from "react";
import type { Pattern } from "@buzzzz/core";
import type { IAudioAnalysis } from "../audio/model";
import { AnimationFilmstrip } from "./AnimationFilmstrip";
import type { IAnimationDocument } from "../animation/model";
import type { IAnimationAnalysis } from "../animation/model";
import { curvePoints, normalize } from "./timelineGeometry";
import type { IRiveCueTimeline } from "../rive/riveCueTimeline";
import { PlaybackCursor } from "./PlaybackCursor";

type TimelineLaneId = "pattern" | "audio" | "motion";

interface ITimelineLanes {
  pattern: Pattern;
  audio: IAudioAnalysis | null;
  animation: IAnimationAnalysis | null;
  end: number;
  start: number;
  animationDocument?: IAnimationDocument | null;
  riveCues?: IRiveCueTimeline | null;
  getPlayhead?: () => number | null;
}

interface ILane {
  id: TimelineLaneId;
  label: string;
  children: ReactNode;
}

interface ILaneData<T> {
  data: T;
  end: number;
  start: number;
  getPlayhead?: () => number | null;
  segments?: readonly Pattern[];
}

const HEIGHT = 56;
const x = (time: number, end: number, start: number) => ((time - start) / end) * 1000;

function extendCurve(points: Pattern["continuousPattern"]["amplitude"], end: number) {
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const last = sorted.at(-1);
  if (last && last.time < end) sorted.push({ ...last, time: end });
  return sorted;
}

function Lane(props: ILane) {
  const { id, label, children } = props;
  return (
    <div className={`timeline-lane timeline-lane-${id}`} data-lane={id}>
      <svg viewBox={`0 0 1000 ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={label}>
        {children}
      </svg>
    </div>
  );
}

function PatternLane(props: ILaneData<Pattern>) {
  const { data: pattern, end, start } = props;
  const continuousEnd = Math.max(
    0,
    ...pattern.continuousPattern.amplitude.map((point) => point.time),
    ...pattern.continuousPattern.frequency.map((point) => point.time),
  );
  const points = extendCurve(pattern.continuousPattern.amplitude, continuousEnd);
  const amplitude = curvePoints(points, end, HEIGHT, start);
  const frequency = curvePoints(
    extendCurve(pattern.continuousPattern.frequency, continuousEnd),
    end,
    HEIGHT,
    start,
  );
  const [first, last] = [points[0]?.time ?? 0, points.at(-1)?.time ?? 0].map((time) =>
    x(time, end, start),
  );
  return (
    <Lane id="pattern" label="Pattern overview">
      {props.segments ? (
        props.segments.map((segment, index) => {
          const points = segment.continuousPattern.amplitude;
          const curve = curvePoints(points, end, HEIGHT, start);
          const first = points[0]?.time ?? 0;
          const last = points.at(-1)?.time ?? 0;
          return (
            <g key={index} data-pattern-segment={index}>
              {curve && (
                <polygon
                  points={`${x(first, end, start)},${HEIGHT} ${curve} ${x(last, end, start)},${HEIGHT}`}
                  className="timeline-amp-fill"
                />
              )}
              <polyline
                points={curvePoints(segment.continuousPattern.frequency, end, HEIGHT, start)}
                className="timeline-freq"
              />
            </g>
          );
        })
      ) : (
        <>
          {amplitude && (
            <polygon
              points={`${first},${HEIGHT} ${amplitude} ${last},${HEIGHT}`}
              className="timeline-amp-fill"
            />
          )}
          <polyline points={frequency} className="timeline-freq" />
        </>
      )}
      {pattern.discretePattern.map((tap, index) => (
        <line
          key={index}
          x1={x(tap.time, end, start)}
          x2={x(tap.time, end, start)}
          y1={0}
          y2={HEIGHT}
          className="timeline-tap"
        />
      ))}
      {props.getPlayhead && (
        <PlaybackCursor
          time={null}
          snapMs={0}
          getTime={props.getPlayhead}
          label={false}
          geometry={{
            width: 1000,
            top: 0,
            bottom: HEIGHT,
            plotHeight: HEIGHT,
            x: (time) => x(time, end, start),
            inView: (time) => time >= start && time <= start + end,
          }}
        />
      )}
    </Lane>
  );
}

function AudioLane(props: ILaneData<IAudioAnalysis>) {
  const { data: audio, end, start } = props;
  const half = HEIGHT / 2;
  const levels = normalize(
    audio.frames,
    (frame) => frame.rms,
    (frame) => frame.timeMs,
  );
  return (
    <Lane id="audio" label="Audio waveform">
      {levels.map((point, index) => {
        const value = point.value > 0 ? Math.max(0.015, 1 + Math.log10(point.value) / 3) : 0;
        return (
          <line
            key={index}
            x1={x(point.time, end, start)}
            x2={x(point.time, end, start)}
            y1={half - value * (half - 3)}
            y2={half + value * (half - 3)}
            className="timeline-wave"
          />
        );
      })}
    </Lane>
  );
}

function MotionLane(props: ILaneData<IAnimationAnalysis>) {
  const { data: animation, end, start } = props;
  const energy = normalize(
    animation.frames,
    (frame) => frame.energy,
    (frame) => frame.timeMs,
  );
  return (
    <Lane id="motion" label="Motion energy">
      <polyline points={curvePoints(energy, end, HEIGHT - 4, start)} className="timeline-motion" />
      {animation.impacts.map((impact, index) => (
        <line
          key={index}
          x1={x(impact.timeMs, end, start)}
          x2={x(impact.timeMs, end, start)}
          y1={0}
          y2={HEIGHT - 4}
          className="timeline-impact"
        />
      ))}
    </Lane>
  );
}

export function TimelineLanes(props: ITimelineLanes) {
  const { pattern, audio, animation, animationDocument, end, start } = props;
  return (
    <>
      {audio && <AudioLane data={audio} end={end} start={start} />}
      {animationDocument ? (
        <div className="timeline-lane timeline-lane-motion" data-lane="motion">
          <AnimationFilmstrip document={animationDocument} end={end} start={start} />
        </div>
      ) : (
        animation && <MotionLane data={animation} end={end} start={start} />
      )}
      <PatternLane
        data={props.riveCues?.pattern ?? pattern}
        end={end}
        start={start}
        segments={props.riveCues?.segments}
        getPlayhead={props.getPlayhead}
      />
    </>
  );
}
