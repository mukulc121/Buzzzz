import Svg, { Line, Polyline } from "react-native-svg";
import { patternEnd, type Pattern } from "@buzzzz/core";
import type { Theme } from "../../theme/colors";

interface IPatternWaveform {
  pattern: Pattern;
  t: Theme;
  height?: number;
}
export function PatternWaveform(props: IPatternWaveform) {
  const { pattern, t, height = 90 } = props;
  const end = Math.max(100, patternEnd(pattern));
  const x = (time: number) => 4 + (time / end) * 292;
  const y = (value: number) => 86 - value * 78;
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 300 90"
      accessibilityLabel="Pattern intensity and frequency waveform"
      role="img"
    >
      {Array.from({ length: 16 }, (_, i) => (
        <Line
          key={`x${i}`}
          x1={i * 20}
          x2={i * 20}
          y1={0}
          y2={90}
          stroke={t.line}
          strokeWidth={0.6}
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Line
          key={`y${i}`}
          x1={0}
          x2={300}
          y1={i * 18}
          y2={i * 18}
          stroke={t.line}
          strokeWidth={0.6}
        />
      ))}
      {pattern.discretePattern.map((point, index) => (
        <Line
          key={index}
          x1={x(point.time)}
          x2={x(point.time)}
          y1={y(0)}
          y2={y(point.amplitude)}
          stroke={t.highlight}
          strokeWidth={4}
        />
      ))}
      <Polyline
        points={[...pattern.continuousPattern.amplitude]
          .sort((a, b) => a.time - b.time)
          .map((p) => `${x(p.time)},${y(p.value)}`)
          .join(" ")}
        fill="none"
        stroke={t.highlight}
        strokeWidth={2}
      />
      <Polyline
        points={[...pattern.continuousPattern.frequency]
          .sort((a, b) => a.time - b.time)
          .map((p) => `${x(p.time)},${y(p.value)}`)
          .join(" ")}
        fill="none"
        stroke={t.fg}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
    </Svg>
  );
}
