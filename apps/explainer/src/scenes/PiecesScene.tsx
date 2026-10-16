import { Appear, Card, Scene } from "../components/Layout";
import { C, MONO } from "../theme/tokens";

const APPS = [
  [
    "Studio",
    "apps/studio",
    "React + Vite+",
    "Composer · Media · Tools",
    "Browser workers + local relay",
  ],
  [
    "Preview",
    "apps/preview",
    "Expo + React Native",
    "Rive + Pulsar playback",
    "Metro on port 8082",
  ],
  ["Relay", "apps/relay", "Cloudflare Workers", "Isolated rooms + MCP", "Durable Objects + R2"],
  ["Explainer", "apps/explainer", "Remotion", "Scenes + narration", "Chromium → MP4"],
];
export function PiecesScene() {
  return (
    <Scene kicker="Bun monorepo" title="Four apps. Shared contracts.">
      {APPS.map(([name, path, runtime, first, second], i) => (
        <Appear key={name} delay={8 + i * 12}>
          <Card x={120 + i * 430} y={300} w={390} h={355}>
            <b style={{ fontSize: 36 }}>{name}</b>
            <div style={{ fontFamily: MONO, color: C.accent, fontSize: 21, marginTop: 14 }}>
              {path}
            </div>
            <div style={{ color: C.muted, fontSize: 22, marginTop: 18 }}>{runtime}</div>
            <div style={{ color: C.fg2, fontSize: 24, lineHeight: 1.55, marginTop: 30 }}>
              {first}
              <br />
              {second}
            </div>
          </Card>
        </Appear>
      ))}
      <Appear delay={65}>
        <Card x={120} y={710} w={1680} h={150} style={{ background: C.sunken }}>
          <b style={{ fontSize: 30, fontFamily: MONO }}>packages/core</b>
          <div style={{ fontSize: 25, color: C.fg2, marginTop: 14 }}>
            Validated patterns · Projects and editor state · Relay messages · Shared limits
          </div>
        </Card>
      </Appear>
      <Appear
        delay={85}
        style={{
          position: "absolute",
          left: 120,
          top: 930,
          fontFamily: MONO,
          fontSize: 24,
          color: C.fg2,
        }}
      >
        app/ · features/ · components/ · hooks/ · theme/ · __tests__/
      </Appear>
    </Scene>
  );
}
