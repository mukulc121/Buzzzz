import { Appear, Card, Pill, Scene } from "../components/Layout";
import { C } from "../theme/tokens";

const TABS = [
  ["Home", "Pair and check connection"],
  ["Presets", "Search and save favorites"],
  ["Playground", "Record and export touch patterns"],
  ["Demos", "Try sound, motion, and sensors"],
  ["Preview", "Rive with mapped haptics"],
];
export function PreviewScene() {
  return (
    <Scene kicker="Native Preview" title="A phone app for exploring haptics">
      <Appear delay={8}>
        <Card x={120} y={290} w={500} h={570}>
          <Pill>Expo development build</Pill>
          <div style={{ fontSize: 38, fontWeight: 750, marginTop: 36 }}>Buzzzz Preview</div>
          <div style={{ color: C.fg2, fontSize: 27, lineHeight: 1.7, marginTop: 32 }}>
            Pulsar playback
            <br />
            Rive animations
            <br />
            Local or hosted pairing
          </div>
          <div style={{ color: C.accent, fontSize: 24, marginTop: 36 }}>
            Install a native build.
            <br />
            Expo Go lacks these modules.
          </div>
        </Card>
      </Appear>
      <div
        style={{
          position: "absolute",
          left: 690,
          top: 290,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: 1110,
        }}
      >
        {TABS.map(([name, detail], i) => (
          <Appear key={name} delay={25 + i * 12}>
            <Card
              x={0}
              y={0}
              w={1110}
              h={100}
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 24 }}
            >
              <b style={{ width: 210, fontSize: 29 }}>{name}</b>
              <span style={{ fontSize: 25, color: C.fg2 }}>{detail}</span>
            </Card>
          </Appear>
        ))}
      </div>
      <Appear
        delay={95}
        style={{ position: "absolute", left: 120, top: 930, color: C.fg2, fontSize: 25 }}
      >
        A simulator can show the UI. Check the final haptic feel and sensor behavior on physical
        hardware.
      </Appear>
    </Scene>
  );
}
