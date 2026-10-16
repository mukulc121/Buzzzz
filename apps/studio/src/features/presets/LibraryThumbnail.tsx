import { patternEnd, type Pattern } from "@buzzzz/core";

interface ILibraryThumbnail {
  pattern: Pattern;
}

export function LibraryThumbnail(props: ILibraryThumbnail) {
  const { pattern } = props;
  const end = patternEnd(pattern) || 1;
  const x = (time: number) => (time / end) * 36;
  const y = (value: number) => 27 - value * 26;
  const amplitude = pattern.continuousPattern.amplitude;
  const line =
    amplitude.length > 1
      ? `M${amplitude.map((point) => `${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`).join(" L")}`
      : "";
  return (
    <svg
      className="library-thumbnail"
      viewBox="0 0 36 28"
      width="36"
      height="28"
      aria-hidden="true"
    >
      <line className="library-thumbnail-baseline" x1="0" y1="27" x2="36" y2="27" />
      {line && <path className="library-thumbnail-curve" d={line} />}
      {pattern.discretePattern.map((point, index) => (
        <line
          className="library-thumbnail-tap"
          key={index}
          x1={x(point.time)}
          x2={x(point.time)}
          y1="27"
          y2={y(point.amplitude)}
        />
      ))}
    </svg>
  );
}
