import { Appear, Card, Pill, Scene } from "../components/Layout";
import { C } from "../theme/tokens";

const TOOLS = [
  ["Pulsar library", "Browse presets and collections"],
  ["Snippets", "Insert a reusable haptic phrase"],
  ["Tap rhythm", "Record the timing of your taps"],
  ["Voice sketch", "Capture a microphone envelope"],
  ["Time warp", "Stretch or compress a pattern"],
  ["Audio trim", "Set the source playback window"],
  ["Signal analyzer", "Inspect the pattern's shape"],
  ["Compatibility linter", "Check output constraints"],
];
export function ToolsScene() {
  return (
    <Scene kicker="Tools" title="Build, inspect, and tune in one workspace">
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 280,
          display: "grid",
          gridTemplateColumns: "repeat(4, 390px)",
          gap: 40,
        }}
      >
        {TOOLS.map(([name, description], i) => (
          <Appear key={name} delay={8 + i * 7}>
            <Card x={0} y={0} w={390} h={225} style={{ position: "relative" }}>
              <div style={{ color: C.accent, fontSize: 22 }}>0{i + 1}</div>
              <b style={{ display: "block", marginTop: 14, fontSize: 29 }}>{name}</b>
              <div style={{ color: C.fg2, fontSize: 23, lineHeight: 1.45, marginTop: 14 }}>
                {description}
              </div>
            </Card>
          </Appear>
        ))}
      </div>
      <Appear
        delay={85}
        style={{ position: "absolute", left: 120, top: 850, display: "flex", gap: 18 }}
      >
        <Pill>Contrast</Pill>
        <Pill>Gamma</Pill>
        <Pill>Silence floor</Pill>
        <Pill>Transient ducking</Pill>
        <Pill>Envelope resolution</Pill>
      </Appear>
      <Appear
        delay={100}
        style={{ position: "absolute", left: 120, top: 930, fontSize: 24, color: C.fg2 }}
      >
        Settings changes the real editor. Learn has four walkthroughs for editing, pairing, sound,
        and animation.
      </Appear>
    </Scene>
  );
}
