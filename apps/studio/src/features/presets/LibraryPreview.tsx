import { patternEnd, type Pattern } from "@buzzzz/core";

interface ILibraryPreview {
  pattern: Pattern;
}

export function LibraryPreview(props: ILibraryPreview) {
  const { pattern } = props;
  const end = patternEnd(pattern) || 1;
  const x = (time: number) => (time / end) * 100;
  const y = (value: number) => 100 - value * 100;
  const line = (points: Pattern["continuousPattern"]["amplitude"]) =>
    points.length > 1
      ? `M${points.map((point) => `${x(point.time).toFixed(2)},${y(point.value).toFixed(2)}`).join(" L")}`
      : "";
  const intensity = line(pattern.continuousPattern.amplitude);
  const frequency = line(pattern.continuousPattern.frequency);
  const amplitude = pattern.continuousPattern.amplitude;
  const area = intensity
    ? `${intensity} L${x(amplitude.at(-1)?.time ?? 0)},100 L${x(amplitude[0]?.time ?? 0)},100 Z`
    : "";
  return (
    <figure className="library-preview-figure">
      <svg
        className="library-preview-chart"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Pattern shape: intensity envelope, frequency envelope and discrete events"
      >
        {[0.25, 0.5, 0.75].map((value) => (
          <line
            key={value}
            x1="0"
            y1={y(value)}
            x2="100"
            y2={y(value)}
            stroke="var(--library-grid)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {area && <path d={area} fill="var(--library-area)" />}
        {pattern.discretePattern.map((point, index) => (
          <line
            key={index}
            x1={x(point.time)}
            x2={x(point.time)}
            y1="100"
            y2={y(point.amplitude)}
            stroke="var(--library-discrete)"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {intensity && (
          <path
            d={intensity}
            fill="none"
            stroke="var(--library-intensity)"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {frequency && (
          <path
            d={frequency}
            fill="none"
            stroke="var(--library-frequency)"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <figcaption>
        <span>0 ms</span>
        <span>{patternEnd(pattern)} ms</span>
      </figcaption>
      <div className="library-preview-legend">
        {amplitude.length > 0 && (
          <span>
            <i className="library-intensity-swatch" />
            Intensity
          </span>
        )}
        {pattern.continuousPattern.frequency.length > 0 && (
          <span>
            <i className="library-frequency-swatch" />
            Frequency
          </span>
        )}
        {pattern.discretePattern.length > 0 && (
          <span>
            <i className="library-discrete-swatch" />
            Discrete
          </span>
        )}
      </div>
    </figure>
  );
}
