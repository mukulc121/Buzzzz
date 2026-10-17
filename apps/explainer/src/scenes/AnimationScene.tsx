import { useCurrentFrame } from "remotion";
import { Appear, Card, Pill, Scene } from "../components/Layout";
import { C } from "../theme/tokens";

export function AnimationScene() {
  const frame = useCurrentFrame();
  const rise = Math.abs(Math.sin(frame / 24)) * 190;
  return (
    <Scene kicker="Animation" title="Generate from Lottie motion. Refine by hand.">
      <Appear delay={8}>
        <Card x={120} y={270} w={780} h={610}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b style={{ fontSize: 30 }}>bounce.lottie</b>
            <Pill>1× · ▶</Pill>
          </div>
          <div
            style={{
              height: 360,
              marginTop: 24,
              position: "relative",
              background: C.sunken,
              borderRadius: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 70,
                right: 70,
                bottom: 55,
                height: 2,
                background: C.line,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 325,
                bottom: 57 + rise,
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: C.accent,
              }}
            />
          </div>
          <div style={{ marginTop: 26, display: "flex", gap: 16 }}>
            <Pill>Stacked</Pill>
            <Pill>Side by side</Pill>
            <Pill>Fullscreen</Pill>
          </div>
        </Card>
      </Appear>
      <Appear delay={30}>
        <Card x={950} y={270} w={850} h={610}>
          <b style={{ fontSize: 30 }}>Five approaches</b>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            {["Hybrid", "Energy", "Kinematic", "Impulse", "Channel"].map((name) => (
              <Pill key={name}>{name}</Pill>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 35 }}>
            {[
              ["Sample rate", "240 fps"],
              ["Smoothing", "12 ms"],
              ["Envelope gain", "1.2"],
              ["Impact threshold", "0.17"],
              ["Minimum gap", "70 ms"],
              ["Frequency follow", "0.70"],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 16, background: C.sunken, borderRadius: 8 }}>
                <div style={{ color: C.muted, fontSize: 19 }}>{label}</div>
                <b style={{ display: "block", marginTop: 6, fontSize: 25 }}>{value}</b>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 26, color: C.fg2, fontSize: 23 }}>
            Canvas playback · Seek · Speed · Multi-animation archives
          </div>
        </Card>
      </Appear>
      <Appear
        delay={85}
        style={{ position: "absolute", left: 120, top: 930, fontSize: 24, color: C.fg2 }}
      >
        Transform and channel analysis · Motion-based physics estimates · Complex effects may differ
      </Appear>
    </Scene>
  );
}
