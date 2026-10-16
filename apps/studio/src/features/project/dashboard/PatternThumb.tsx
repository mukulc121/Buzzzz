import { patternEnd, type Pattern } from "@buzzzz/core";

const W = 36;
const H = 28;

interface IPatternThumb {
  pattern: Pattern;
}

export function PatternThumb(props: IPatternThumb) {
  const { pattern } = props;
  const end = patternEnd(pattern) || 1;
  const x = (time: number) => (time / end) * W;
  const y = (value: number) => H - value * (H - 2) - 1;
  const amplitude = pattern.continuousPattern.amplitude;
  const curve =
    amplitude.length > 1
      ? `M${amplitude.map((point) => `${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`).join(" L")}`
      : "";
  return (
    <svg className="pattern-thumb" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      <line className="pattern-thumb-baseline" x1={0} y1={H - 1} x2={W} y2={H - 1} />
      {curve && <path className="pattern-thumb-curve" d={curve} />}
      {pattern.discretePattern.map((tap, index) => (
        <line
          key={index}
          className="pattern-thumb-tick"
          x1={x(tap.time)}
          y1={H - 1}
          x2={x(tap.time)}
          y2={y(tap.amplitude)}
        />
      ))}
    </svg>
  );
}
