import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "../theme/tokens";

interface IWorkspaceChart {
  theme: typeof C;
  compact: boolean;
}
export function WorkspaceChart(props: IWorkspaceChart) {
  const { theme: t, compact } = props;
  const frame = useCurrentFrame();
  const playhead = interpolate(frame, [70, 210], [0, 600], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.line}`,
        borderRadius: 8,
        padding: compact ? 12 : 18,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: compact ? 10 : 20,
          fontSize: compact ? 11 : 14,
          marginBottom: 20,
        }}
      >
        <span style={{ color: t.amp }}>● Intensity</span>
        <span style={{ color: t.freq }}>● Frequency</span>
        <span style={{ color: t.tap }}>● Taps</span>
      </div>
      <svg
        viewBox="0 0 600 240"
        style={{ width: "100%", height: compact ? 145 : 225, overflow: "visible" }}
      >
        {[0, 60, 120, 180, 240].map((y) => (
          <line key={y} x1="0" x2="600" y1={y} y2={y} stroke={t.line} />
        ))}
        <rect x="75" y="0" width="375" height="240" fill={t.accent} opacity="0.05" />
        <path
          d="M0,240 L30,50 L60,230 L160,220 L200,80 L240,210 L370,180 L410,110 L450,225 L600,240"
          fill="none"
          stroke={t.muted}
          strokeWidth="2"
          opacity="0.5"
        />
        <path
          d="M0,25 L60,10 L180,155 L320,90 L480,215 L600,240 L0,240 Z"
          fill={t.amp}
          fillOpacity="0.1"
        />
        <path
          d="M0,25 L60,10 L180,155 L320,90 L480,215 L600,240"
          fill="none"
          stroke={t.amp}
          strokeWidth="4"
        />
        <path d="M0,168 L230,72 L600,192" fill="none" stroke={t.freq} strokeWidth="3" />
        {[40, 220, 420].map((x) => (
          <line key={x} x1={x} x2={x} y1="240" y2="54" stroke={t.tap} strokeWidth="4" />
        ))}
        <circle cx="180" cy="155" r="8" fill={t.panel} stroke={t.amp} strokeWidth="4" />
        <line
          x1={playhead}
          x2={playhead}
          y1="0"
          y2="240"
          stroke={t.fg}
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontSize: 11,
          color: t.muted,
        }}
      >
        <span>0 ms</span>
        <span>1000 ms</span>
        <span>2000 ms</span>
      </div>
      <div style={{ marginTop: 18, color: t.muted, fontSize: compact ? 11 : 13 }}>
        Select · Draw · Box select · Zoom to fit
      </div>
    </div>
  );
}
