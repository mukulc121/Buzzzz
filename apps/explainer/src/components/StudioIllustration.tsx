import { interpolate, useCurrentFrame } from "remotion";
import { C, DARK, MONO } from "../theme/tokens";

interface IStudioIllustration {
  theme: typeof C;
  compact?: boolean;
}

export function StudioIllustration(props: IStudioIllustration) {
  const { theme: t, compact = false } = props;
  const frame = useCurrentFrame();
  const playhead = interpolate(frame, [70, 210], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        background: t.bg,
        color: t.fg,
        height: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: `2px solid ${t.line}`,
        boxShadow: "-4px 4px 0 rgba(56, 172, 221, 0.28)",
      }}
    >
      <div
        style={{
          height: 66,
          background: t.panel,
          borderBottom: `1px solid ${t.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 24 }}>ϟ Buzzzz</div>
        <div style={{ color: t.accent, fontSize: compact ? 14 : 17 }}>
          {compact ? "☾" : "Light  ·  System  ·  Dark"}
        </div>
      </div>
      <div
        style={{
          padding: compact ? 18 : 24,
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "200px minmax(0, 1fr) 190px",
          gap: 20,
        }}
      >
        {!compact && (
          <div
            style={{
              background: t.panel,
              border: `1px solid ${t.line}`,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 17, color: t.muted, marginBottom: 20 }}>
              Project · Pulsar library
            </div>
            {["Thud", "Tick", "Celebrate"].map((name, i) => (
              <div
                key={name}
                style={{
                  padding: "14px 12px",
                  marginBottom: 12,
                  borderRadius: 8,
                  fontWeight: i === 0 ? 700 : 500,
                  border: `1px solid ${i === 0 ? t.accent : t.line}`,
                  background: i === 0 ? t.sunken : t.panel,
                  fontSize: 19,
                }}
              >
                <span style={{ color: t.accent, marginRight: 10 }}>⌁</span>
                {name}
              </div>
            ))}
            <div style={{ color: t.muted, fontSize: 16, marginTop: 28 }}>+ New pattern</div>
            <div style={{ fontSize: 16, color: t.fg2, marginTop: 170 }}>Import · Export</div>
          </div>
        )}
        <div>
          <div
            style={{
              color: t.accent,
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1.5,
              fontWeight: 700,
            }}
          >
            Pattern composer
          </div>
          <div
            style={{
              fontSize: compact ? 27 : 34,
              fontWeight: 750,
              letterSpacing: -0.8,
              marginTop: 4,
              marginBottom: 20,
            }}
          >
            Make it feel right.
          </div>
          <div
            style={{
              border: `1px solid ${t.line}`,
              borderRadius: 10,
              background: t.panel,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: compact ? 14 : 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `1px solid ${t.line}`,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 23 }}>Thud</span>
              <span
                style={{
                  background: t.accent,
                  color: compact ? DARK.bg : C.panel,
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 16,
                }}
              >
                ▶ Play
              </span>
            </div>
            <div style={{ padding: compact ? 14 : 20 }}>
              <div
                style={{
                  display: "flex",
                  gap: compact ? 12 : 22,
                  fontSize: compact ? 12 : 15,
                  marginBottom: 22,
                }}
              >
                <span style={{ color: t.amp }}>● Intensity</span>
                <span style={{ color: t.freq }}>● Frequency</span>
                <span style={{ color: t.tap }}>● Taps</span>
              </div>
              <div style={{ position: "relative" }}>
                <svg
                  viewBox="0 0 600 200"
                  style={{ width: "100%", height: compact ? 120 : 160, overflow: "visible" }}
                >
                  {[0, 50, 100, 150, 200].map((y) => (
                    <line key={y} x1="0" x2="600" y1={y} y2={y} stroke={t.line} />
                  ))}
                  <path
                    d="M0,25 L60,10 L180,130 L320,75 L480,180 L600,200 L0,200 Z"
                    fill={t.amp}
                    fillOpacity="0.1"
                  />
                  <path
                    d="M0,25 L60,10 L180,130 L320,75 L480,180 L600,200"
                    fill="none"
                    stroke={t.amp}
                    strokeWidth="4"
                    strokeLinejoin="round"
                  />
                  <path d="M0,140 L230,60 L600,160" fill="none" stroke={t.freq} strokeWidth="3" />
                  {[40, 220, 420].map((x) => (
                    <line key={x} x1={x} x2={x} y1="200" y2="45" stroke={t.tap} strokeWidth="4" />
                  ))}
                  <line
                    x1={playhead * 6}
                    x2={playhead * 6}
                    y1="0"
                    y2="200"
                    stroke={t.fg}
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                  />
                </svg>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: t.muted,
                    fontFamily: MONO,
                  }}
                >
                  <span>0 ms</span>
                  <span>500 ms</span>
                  <span>1000 ms</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 20,
                  border: `1px solid ${t.line}`,
                  padding: 10,
                  borderRadius: 6,
                  fontSize: compact ? 12 : 15,
                  color: t.fg2,
                }}
              >
                Time 260 ms <span style={{ marginLeft: 20 }}>Intensity 70%</span>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              border: `1px solid ${t.line}`,
              borderRadius: 10,
              padding: 16,
              background: t.panel,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>Rive animation</div>
            <div style={{ marginTop: 14, color: t.fg2, fontSize: compact ? 14 : 17 }}>
              impact <span style={{ color: t.accent, marginLeft: 24 }}>→ Thud</span>
            </div>
          </div>
        </div>
        {!compact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.line}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 19 }}>Phone</div>
              <div style={{ color: t.ok, fontSize: 15, marginTop: 14 }}>● 1 connected</div>
              <div style={{ color: t.fg2, fontSize: 15, lineHeight: 1.6, marginTop: 24 }}>
                Pair another phone
              </div>
            </div>
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.line}`,
                borderRadius: 10,
                padding: 16,
                flex: 1,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 19 }}>Activity</div>
              <div style={{ color: t.muted, fontSize: 14, marginTop: 20, lineHeight: 1.7 }}>
                12:04:08
                <br />
                <span style={{ color: t.fg2 }}>Phone fired impact</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
