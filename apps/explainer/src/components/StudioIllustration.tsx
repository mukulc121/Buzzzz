import { C, MONO } from "../theme/tokens";
import { WorkspaceChart } from "./WorkspaceChart";

interface IStudioIllustration {
  theme: typeof C;
  compact?: boolean;
}
export function StudioIllustration(props: IStudioIllustration) {
  const { theme: t, compact = false } = props;
  return (
    <div
      style={{
        background: t.bg,
        color: t.fg,
        height: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: `2px solid ${t.line}`,
      }}
    >
      <div
        style={{
          height: 60,
          background: t.panel,
          borderBottom: `1px solid ${t.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
        }}
      >
        <b style={{ fontSize: compact ? 20 : 24 }}>ϟ Buzzzz</b>
        <span style={{ color: t.muted, fontSize: compact ? 12 : 15 }}>
          {compact ? "☾  ⋮" : "Projects / Bouncing ball  ·  Saved locally     ↶  ↷    Export ▾"}
        </span>
      </div>
      <div style={{ display: "flex", height: "calc(100% - 60px)" }}>
        <div
          style={{
            width: compact ? 48 : 64,
            flexShrink: 0,
            background: t.panel,
            borderRight: `1px solid ${t.line}`,
            paddingTop: 18,
          }}
        >
          {["▤", "♫", "▯", "↗", "⌘", "⚙", "?"].map((icon, i) => (
            <div
              key={icon}
              style={{
                padding: compact ? "12px 0" : "15px 0",
                textAlign: "center",
                fontSize: 23,
                color: i === 0 ? t.accent : t.muted,
                background: i === 0 ? t.sunken : undefined,
              }}
            >
              {icon}
            </div>
          ))}
        </div>
        {!compact && (
          <div
            style={{
              width: 180,
              flexShrink: 0,
              padding: 18,
              background: t.panel,
              borderRight: `1px solid ${t.line}`,
            }}
          >
            <b style={{ fontSize: 20 }}>Patterns</b>
            <div style={{ padding: "12px 0", marginTop: 14, color: t.muted, fontSize: 14 }}>
              ⌕ Search patterns
            </div>
            {["Bounce", "Tick", "Celebrate"].map((name, i) => (
              <div
                key={name}
                style={{
                  padding: "14px 10px",
                  marginTop: 10,
                  fontSize: 17,
                  border: `1px solid ${i === 0 ? t.accent : t.line}`,
                  borderRadius: 7,
                  background: i === 0 ? t.sunken : undefined,
                }}
              >
                ⌁ {name}
              </div>
            ))}
            <div style={{ color: t.accent, marginTop: 28, fontSize: 15 }}>+ New pattern</div>
            <div style={{ color: t.muted, marginTop: 180, fontSize: 13 }}>
              Library · Import · Sort
            </div>
          </div>
        )}
        <div style={{ padding: compact ? 12 : 20, flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <b style={{ fontSize: compact ? 23 : 28 }}>Bounce</b>
            <span
              style={{
                background: t.accent,
                color: t.panel,
                padding: "9px 13px",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              ▶ Play
            </span>
          </div>
          <WorkspaceChart theme={t} compact={compact} />
          <div
            style={{
              marginTop: 18,
              padding: 13,
              border: `1px solid ${t.line}`,
              background: t.panel,
              borderRadius: 8,
              fontSize: compact ? 12 : 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <b>Timeline</b>
              <span style={{ color: t.muted }}>Snap · 20 ms</span>
            </div>
            <div style={{ background: t.sunken, color: t.accent, padding: 10, fontFamily: MONO }}>
              ♫ bounce.wav ▂▃▇▂▅▃▆▁
            </div>
            <div style={{ marginTop: 12, color: t.tap }}>⚑ Impact · 500 ms</div>
            <div style={{ marginTop: 10, color: t.fg2 }}>Range 250–1500 ms</div>
          </div>
          {compact && (
            <div style={{ display: "flex", gap: 8, marginTop: 18, fontSize: 12, color: t.accent }}>
              <span>Inspector</span>
              <span>Sound</span>
              <span>Animation</span>
            </div>
          )}
        </div>
        {!compact && (
          <div
            style={{
              width: 215,
              flexShrink: 0,
              background: t.panel,
              borderLeft: `1px solid ${t.line}`,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
              <b>Inspector</b>
              <span style={{ color: t.muted }}>Sound</span>
              <span style={{ color: t.muted }}>Animation</span>
            </div>
            <b style={{ display: "block", marginTop: 30, fontSize: 18 }}>Selected point</b>
            {[
              ["Time", "260 ms"],
              ["Intensity", "70%"],
              ["Frequency", "50%"],
            ].map(([label, value]) => (
              <div key={label} style={{ marginTop: 24, fontSize: 14 }}>
                <div style={{ color: t.muted, marginBottom: 8 }}>{label}</div>
                <div
                  style={{
                    padding: 10,
                    border: `1px solid ${t.line}`,
                    borderRadius: 6,
                    fontFamily: MONO,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 30, color: t.fg2, fontSize: 14 }}>Duplicate · Delete</div>
          </div>
        )}
      </div>
    </div>
  );
}
